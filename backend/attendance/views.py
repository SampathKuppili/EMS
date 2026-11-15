from datetime import date
from decimal import Decimal
import calendar

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Sum, Count, Q
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import IsAdminOrHR, IsOwnerOrManagerOrAdmin
from .models import AttendanceRecord
from .serializers import (
    AttendanceRecordSerializer,
    TodayAttendanceStatusSerializer,
    CheckInActionSerializer,
    CheckOutActionSerializer,
    AutoClassifyRequestSerializer,
    AttendanceSummarySerializer,
)
from .services import (
    get_today_attendance_status,
    check_in_employee,
    check_out_employee,
    auto_classify_absences_for_date,
)


def get_client_ip(request) -> str:
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


class TodayAttendanceView(APIView):
    """
    Returns today's attendance status for the authenticated user,
    including active timers, check-in eligibility, and leave/holiday notes.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        status_data = get_today_attendance_status(request.user, today)
        record = status_data.get('record')

        elapsed_seconds = 0
        if record and record.is_checked_in and record.check_in:
            now = timezone.now()
            elapsed_seconds = max(0, int((now - record.check_in).total_seconds()))

        payload = {
            "date": status_data["date"],
            "status_label": status_data["status_label"],
            "can_check_in": status_data["can_check_in"],
            "can_check_out": status_data["can_check_out"],
            "is_holiday": status_data["is_holiday"],
            "holiday_name": status_data["holiday_name"],
            "is_weekend": status_data["is_weekend"],
            "is_on_leave": status_data["is_on_leave"],
            "leave_name": status_data["leave_name"],
            "is_half_day_leave": status_data["is_half_day_leave"],
            "record": record,
            "elapsed_seconds": elapsed_seconds,
        }

        serializer = TodayAttendanceStatusSerializer(payload)
        return Response(serializer.data)


class CheckInView(APIView):
    """
    Employee check-in endpoint.
    Records check-in timestamp and client IP, marking attendance as PRESENT.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CheckInActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        notes = serializer.validated_data.get('notes', '')
        client_ip = get_client_ip(request)

        try:
            record = check_in_employee(
                employee=request.user,
                ip_address=client_ip,
                notes=notes,
            )
        except DjangoValidationError as exc:
            msg = exc.message_dict if hasattr(exc, 'message_dict') else str(exc)
            return Response({"detail": msg}, status=status.HTTP_400_BAD_REQUEST)

        record_data = AttendanceRecordSerializer(record).data
        formatted_time = timezone.localtime(record.check_in).strftime('%I:%M %p')
        return Response({
            "message": f"Successfully checked in at {formatted_time}.",
            "record": record_data,
        }, status=status.HTTP_200_OK)


class CheckOutView(APIView):
    """
    Employee check-out endpoint.
    Calculates total work hours and updates record status (PRESENT or HALF_DAY).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CheckOutActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        notes = serializer.validated_data.get('notes', '')

        try:
            record = check_out_employee(
                employee=request.user,
                notes=notes,
            )
        except DjangoValidationError as exc:
            msg = exc.message_dict if hasattr(exc, 'message_dict') else str(exc)
            return Response({"detail": msg}, status=status.HTTP_400_BAD_REQUEST)

        record_data = AttendanceRecordSerializer(record).data
        formatted_time = timezone.localtime(record.check_out).strftime('%I:%M %p')
        return Response({
            "message": f"Successfully checked out at {formatted_time}. Total work: {record.work_duration_hours} hrs.",
            "record": record_data,
        }, status=status.HTTP_200_OK)


class AttendanceRecordViewSet(viewsets.ModelViewSet):
    """
    View, filter, and manage attendance records.
    - Regular employees view only their own records.
    - Managers view their own and direct reports' records.
    - HR / Admins view and manage all records.
    """
    serializer_class = AttendanceRecordSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrManagerOrAdmin]

    def get_queryset(self):
        user = self.request.user
        qs = AttendanceRecord.objects.select_related(
            'employee',
            'employee__profile',
            'employee__profile__department',
        )

        # Scoping based on role
        if user.is_admin_or_hr:
            pass  # Admin/HR can see all
        elif user.role == User.Role.MANAGER:
            # Manager sees self and team members
            qs = qs.filter(
                Q(employee=user) | Q(employee__profile__manager=user)
            )
        else:
            # Employee / Intern sees self only
            qs = qs.filter(employee=user)

        # Query Filters
        employee_id = self.request.query_params.get('employee')
        if employee_id:
            if not user.is_admin_or_hr:
                # Validate manager or self permission
                if str(user.id) != str(employee_id):
                    is_direct_report = User.objects.filter(
                        id=employee_id,
                        profile__manager=user
                    ).exists()
                    if not is_direct_report:
                        raise PermissionDenied("You do not have permission to view this employee's attendance.")
            qs = qs.filter(employee_id=employee_id)

        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        start_date = self.request.query_params.get('start_date')
        if start_date:
            qs = qs.filter(date__gte=start_date)

        end_date = self.request.query_params.get('end_date')
        if end_date:
            qs = qs.filter(date__lte=end_date)

        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')
        if month and year:
            qs = qs.filter(date__year=year, date__month=month)
        elif year:
            qs = qs.filter(date__year=year)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(employee__first_name__icontains=search) |
                Q(employee__last_name__icontains=search) |
                Q(employee__email__icontains=search) |
                Q(employee__profile__employee_code__icontains=search)
            )

        return qs.order_by('-date', '-check_in')

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsAdminOrHR()]
        return [permissions.IsAuthenticated(), IsOwnerOrManagerOrAdmin()]


class AttendanceSummaryView(APIView):
    """
    Returns monthly/periodic attendance summary statistics
    for reports and dashboards.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.localdate()

        target_user_id = request.query_params.get('employee', user.id)
        if str(target_user_id) != str(user.id) and not user.is_admin_or_hr:
            is_report = User.objects.filter(id=target_user_id, profile__manager=user).exists()
            if not is_report:
                raise PermissionDenied("You do not have permission to view this employee's attendance summary.")

        year = int(request.query_params.get('year', today.year))
        month = int(request.query_params.get('month', today.month))

        _, last_day = calendar.monthrange(year, month)
        period_start = date(year, month, 1)
        period_end = date(year, month, last_day)

        qs = AttendanceRecord.objects.filter(
            employee_id=target_user_id,
            date__gte=period_start,
            date__lte=period_end,
        )

        counts = qs.aggregate(
            total=Count('id'),
            present=Count('id', filter=Q(status=AttendanceRecord.Status.PRESENT)),
            half_day=Count('id', filter=Q(status=AttendanceRecord.Status.HALF_DAY)),
            on_leave=Count('id', filter=Q(status__in=[AttendanceRecord.Status.ON_LEAVE, AttendanceRecord.Status.UNPAID_LEAVE])),
            absent=Count('id', filter=Q(status=AttendanceRecord.Status.ABSENT)),
            holiday=Count('id', filter=Q(status=AttendanceRecord.Status.HOLIDAY)),
            weekend=Count('id', filter=Q(status=AttendanceRecord.Status.WEEKEND)),
            total_hours=Sum('work_duration_hours'),
        )

        total_hours = counts['total_hours'] or Decimal('0.00')
        present_count = counts['present'] or 0
        half_day_count = counts['half_day'] or 0
        working_days_worked = present_count + (half_day_count * 0.5)

        avg_hours = Decimal('0.00')
        if working_days_worked > 0:
            avg_hours = Decimal(str(round(float(total_hours) / working_days_worked, 2)))

        data = {
            "period_start": period_start,
            "period_end": period_end,
            "total_records": counts['total'] or 0,
            "present_days": present_count,
            "half_days": half_day_count,
            "on_leave_days": counts['on_leave'] or 0,
            "absent_days": counts['absent'] or 0,
            "holiday_days": counts['holiday'] or 0,
            "weekend_days": counts['weekend'] or 0,
            "total_work_hours": total_hours,
            "avg_work_hours_per_present_day": avg_hours,
        }

        serializer = AttendanceSummarySerializer(data)
        return Response(serializer.data)


class AutoClassifyAttendanceView(APIView):
    """
    Trigger automated classification for missing check-ins.
    Designated for HR Managers and Admins or automated nightly tasks.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminOrHR]

    def post(self, request):
        serializer = AutoClassifyRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        target_date = serializer.validated_data.get('date') or timezone.localdate()

        classified_count = auto_classify_absences_for_date(target_date)

        return Response({
            "date": target_date,
            "classified_count": classified_count,
            "message": f"Successfully classified {classified_count} attendance records for {target_date}.",
        }, status=status.HTTP_200_OK)
