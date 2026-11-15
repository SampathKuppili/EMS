from decimal import Decimal
from django.core.exceptions import PermissionDenied, ValidationError as DjangoValidationError
from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import IsAdminOrHR
from approvals.services import process_leave_approval, process_leave_cancellation
from leave.models import LeaveType, LeaveBalance, LeaveRequest
from leave.serializers import (
    LeaveTypeSerializer,
    LeaveBalanceSerializer,
    LeaveBalanceAllocationSerializer,
    LeaveRequestSerializer,
    LeaveRequestCreateSerializer,
    LeaveDurationPreviewSerializer,
)
from leave.services import calculate_leave_duration
from notifications.models import Notification


class LeaveTypeViewSet(viewsets.ModelViewSet):
    """
    CRUD endpoint for leave types.
    Authenticated users can list active leave types; HR can manage them.
    """
    serializer_class = LeaveTypeSerializer
    filterset_fields = ['is_active', 'requires_approval', 'is_paid']
    search_fields = ['name', 'code', 'description']

    def get_queryset(self):
        if self.request.user.is_admin_or_hr:
            return LeaveType.objects.all().order_by('name')
        return LeaveType.objects.filter(is_active=True).order_by('name')

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsAdminOrHR()]

    def destroy(self, request, *args, **kwargs):
        from django.db.models import ProtectedError
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {
                    'detail': 'Cannot permanently delete this leave type because existing leave requests reference it. You can deactivate it instead to prevent future requests.'
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrHR], url_path='toggle-active')
    def toggle_active(self, request, pk=None):
        """Toggle the active status of a leave type."""
        leave_type = self.get_object()
        leave_type.is_active = not leave_type.is_active
        leave_type.save(update_fields=['is_active'])
        return Response(LeaveTypeSerializer(leave_type).data, status=status.HTTP_200_OK)


class LeaveBalanceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    View leave balances.
    Employees see only their own balances.
    Managers see team members' balances.
    HR sees all employees' balances and can allocate/adjust them.
    """
    serializer_class = LeaveBalanceSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['year', 'leave_type', 'employee']

    def get_queryset(self):
        user = self.request.user
        qs = (
            LeaveBalance.objects.select_related('employee', 'leave_type')
            .all()
            .order_by('-year', 'leave_type__name')
        )
        if user.is_admin_or_hr:
            return qs
        if user.is_manager:
            return qs.filter(
                Q(employee=user) | Q(employee__profile__manager=user)
            )
        return qs.filter(employee=user)

    @action(detail=False, methods=['post'], permission_classes=[IsAdminOrHR])
    def allocate(self, request):
        """HR endpoint to allocate or adjust an employee's leave balance."""
        serializer = LeaveBalanceAllocationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            employee = User.objects.get(pk=data['employee_id'])
            leave_type = LeaveType.objects.get(pk=data['leave_type_id'])
        except (User.DoesNotExist, LeaveType.DoesNotExist) as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        defaults = {
            'allocated_days': data['allocated_days'],
            'used_days': data.get('used_days', Decimal('0.0')),
        }
        if 'carried_forward_days' in data:
            defaults['carried_forward_days'] = data['carried_forward_days']

        balance, created = LeaveBalance.objects.update_or_create(
            employee=employee,
            leave_type=leave_type,
            year=data['year'],
            defaults=defaults,
        )
        return Response(LeaveBalanceSerializer(balance).data, status=status.HTTP_200_OK)


class LeaveRequestViewSet(viewsets.ModelViewSet):
    """
    Leave request submission, tracking, approval, rejection, and cancellation.
    - Employee: submits and views own requests; cancels own requests.
    - Manager: views team requests; approves/rejects with comments.
    - HR: full overview and overrides.
    """
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'leave_type', 'employee', 'is_half_day']
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__email', 'reason']
    ordering_fields = ['submitted_at', 'start_date', 'status']

    def get_queryset(self):
        user = self.request.user
        qs = (
            LeaveRequest.objects.select_related(
                'employee',
                'employee__profile',
                'employee__profile__department',
                'leave_type',
            )
            .prefetch_related('approval_history', 'approval_history__approver')
            .all()
            .order_by('-submitted_at')
        )
        if user.is_admin_or_hr:
            return qs
        if user.is_manager:
            return qs.filter(
                Q(employee=user) | Q(employee__profile__manager=user)
            )
        return qs.filter(employee=user)

    def get_serializer_class(self):
        if self.action == 'create':
            return LeaveRequestCreateSerializer
        return LeaveRequestSerializer

    def perform_create(self, serializer):
        leave_request = serializer.save()
        # Notify employee's manager if configured
        manager = getattr(getattr(leave_request.employee, 'profile', None), 'manager', None)
        if manager:
            Notification.objects.create(
                recipient=manager,
                title=f"New Leave Request from {leave_request.employee.full_name}",
                message=(
                    f"{leave_request.employee.full_name} submitted a {leave_request.leave_type.name} request "
                    f"from {leave_request.start_date} to {leave_request.end_date} ({leave_request.duration_days} days). "
                    f"Reason: {leave_request.reason}"
                ),
                link=f"/approvals",
            )

    @action(detail=False, methods=['post'], url_path='preview-duration')
    def preview_duration(self, request):
        """Preview server-calculated duration for a date range without submitting."""
        serializer = LeaveDurationPreviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            duration = calculate_leave_duration(
                data['start_date'],
                data['end_date'],
                data.get('is_half_day', False),
            )
            return Response({'duration_days': duration, 'status': 'valid'})
        except DjangoValidationError as e:
            msg = e.message_dict if hasattr(e, 'message_dict') else str(e)
            return Response({'error': msg, 'status': 'invalid'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a pending leave request with optional comments."""
        comment = request.data.get('comment', '').strip()
        try:
            leave_request = process_leave_approval(pk, request.user, 'APPROVED', comment)
            return Response(LeaveRequestSerializer(leave_request).data, status=status.HTTP_200_OK)
        except PermissionDenied as e:
            return Response({'detail': str(e)}, status=status.HTTP_403_FORBIDDEN)
        except (DjangoValidationError, ValueError) as e:
            msg = e.message_dict if hasattr(e, 'message_dict') else str(e)
            return Response({'detail': msg}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a pending leave request with a required or optional comment."""
        comment = request.data.get('comment', '').strip()
        try:
            leave_request = process_leave_approval(pk, request.user, 'REJECTED', comment)
            return Response(LeaveRequestSerializer(leave_request).data, status=status.HTTP_200_OK)
        except PermissionDenied as e:
            return Response({'detail': str(e)}, status=status.HTTP_403_FORBIDDEN)
        except (DjangoValidationError, ValueError) as e:
            msg = e.message_dict if hasattr(e, 'message_dict') else str(e)
            return Response({'detail': msg}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a pending or approved leave request, automatically reversing balances."""
        reason = request.data.get('cancellation_reason', '').strip()
        try:
            leave_request = process_leave_cancellation(pk, request.user, reason)
            return Response(LeaveRequestSerializer(leave_request).data, status=status.HTTP_200_OK)
        except PermissionDenied as e:
            return Response({'detail': str(e)}, status=status.HTTP_403_FORBIDDEN)
        except (DjangoValidationError, ValueError) as e:
            msg = e.message_dict if hasattr(e, 'message_dict') else str(e)
            return Response({'detail': msg}, status=status.HTTP_400_BAD_REQUEST)


class LeaveCalendarView(APIView):
    """
    GET /api/v1/leave/calendar/
    Provides calendar data for approved and pending leaves.
    - HR: sees all leaves company-wide.
    - Manager: sees own and team leaves.
    - Employee: sees team/department leaves so they know coworker coverage.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        start = request.query_params.get('start_date')
        end = request.query_params.get('end_date')

        qs = LeaveRequest.objects.filter(
            status__in=[LeaveRequest.Status.APPROVED, LeaveRequest.Status.PENDING]
        ).select_related('employee', 'employee__profile', 'employee__profile__department', 'leave_type')

        if start:
            qs = qs.filter(end_date__gte=start)
        if end:
            qs = qs.filter(start_date__lte=end)

        # Team scoping for non-HR
        if not user.is_admin_or_hr:
            dept = getattr(getattr(user, 'profile', None), 'department', None)
            if dept:
                qs = qs.filter(
                    Q(employee=user) |
                    Q(employee__profile__department=dept) |
                    Q(employee__profile__manager=user)
                )
            else:
                qs = qs.filter(
                    Q(employee=user) | Q(employee__profile__manager=user)
                )

        events = []
        for req in qs:
            events.append({
                'id': req.id,
                'employee_id': req.employee_id,
                'employee_name': req.employee.full_name,
                'department_name': getattr(getattr(req.employee, 'profile', None), 'department', None) and req.employee.profile.department.name,
                'leave_type': req.leave_type.name,
                'leave_type_code': req.leave_type.code,
                'start_date': str(req.start_date),
                'end_date': str(req.end_date),
                'duration_days': float(req.duration_days),
                'status': req.status,
                'is_half_day': req.is_half_day,
            })

        return Response(events)
