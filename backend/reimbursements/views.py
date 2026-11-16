from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from accounts.models import User
from accounts.permissions import IsAdminOrHR
from .models import ReimbursementClaim
from .serializers import (
    ReimbursementClaimSerializer,
    ReimbursementReviewActionSerializer,
)


class ReimbursementClaimViewSet(viewsets.ModelViewSet):
    """
    CRUD API for Expense & Bill Reimbursement Claims.
    - Employee: Submit claims and receipts, track status of own claims.
    - Manager: View and review direct report claims.
    - HR & Admin: Full approval, rejection, and payment processing.
    """
    serializer_class = ReimbursementClaimSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'category', 'currency', 'employee']
    search_fields = [
        'title',
        'merchant',
        'description',
        'employee__first_name',
        'employee__last_name',
        'employee__email',
    ]

    def get_queryset(self):
        user = self.request.user
        qs = ReimbursementClaim.objects.select_related('employee', 'reviewed_by').all()

        if user.role in [User.Role.ADMIN, User.Role.HR_MANAGER] or user.is_superuser:
            return qs

        if user.role == User.Role.MANAGER:
            # Manager sees own claims + claims of managed employees
            return qs.filter(
                employee__profile__manager=user
            ) | qs.filter(employee=user)

        # Standard employee sees only own claims
        return qs.filter(employee=user)

    def perform_create(self, serializer):
        serializer.save(employee=self.request.user)

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == User.Role.ADMIN or user.is_superuser:
            instance.delete()
        elif instance.employee_id == user.id and instance.status == ReimbursementClaim.Status.PENDING:
            instance.delete()
        else:
            raise PermissionDenied("Only pending claims may be deleted by the employee.")

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def review(self, request, pk=None):
        """
        Approve, reject, or mark paid for a reimbursement claim.
        Allowed for Managers (for reports), HR Managers, and Admins.
        """
        claim = self.get_object()
        user = request.user

        is_admin_hr = user.role in [User.Role.ADMIN, User.Role.HR_MANAGER] or user.is_superuser
        is_direct_manager = (
            user.role == User.Role.MANAGER and
            hasattr(claim.employee, 'profile') and
            claim.employee.profile.manager_id == user.id
        )

        if not (is_admin_hr or is_direct_manager):
            raise PermissionDenied("You do not have permission to review this reimbursement claim.")

        serializer = ReimbursementReviewActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        act = serializer.validated_data['action']
        notes = serializer.validated_data.get('review_notes') or serializer.validated_data.get('comments', '')
        pay_ref = serializer.validated_data.get('payment_reference', '')

        if pay_ref:
            claim.payment_reference = pay_ref

        if act == 'APPROVE':
            claim.status = ReimbursementClaim.Status.APPROVED
            claim.reviewed_by = user
            claim.reviewed_at = timezone.now()
            if notes:
                claim.review_notes = notes
        elif act == 'REJECT':
            claim.status = ReimbursementClaim.Status.REJECTED
            claim.reviewed_by = user
            claim.reviewed_at = timezone.now()
            claim.review_notes = notes or 'Claim rejected by reviewer.'
        elif act == 'MARK_PAID':
            if not is_admin_hr:
                raise PermissionDenied("Only HR Managers or Admins can mark claims as disbursed/paid.")
            claim.status = ReimbursementClaim.Status.PAID
            claim.paid_at = timezone.now()
            if notes:
                claim.review_notes = notes

        claim.save()
        return Response(ReimbursementClaimSerializer(claim, context={'request': request}).data)
