from decimal import Decimal
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.utils import timezone

from .models import ApprovalHistory
from leave.models import LeaveBalance, LeaveRequest
from notifications.models import Notification
from reports.models import AuditLog


@transaction.atomic
def process_leave_approval(leave_request_id: int, approver, action: str, comment: str = "") -> LeaveRequest:
    """
    Executes an approval or rejection atomically with row-locking (select_for_update),
    idempotency checks, balance deduction, approval history recording,
    notification generation, and audit logging.
    """
    # 1. Row-lock the leave request
    try:
        leave_request = (
            LeaveRequest.objects.select_for_update()
            .select_related('employee', 'leave_type')
            .get(pk=leave_request_id)
        )
    except LeaveRequest.DoesNotExist:
        raise ValidationError(f"Leave request #{leave_request_id} does not exist.")

    # 2. Authorization check: approver must be HR/Admin OR direct reporting manager
    is_hr = approver.is_admin_or_hr
    employee_manager = getattr(getattr(leave_request.employee, 'profile', None), 'manager', None)
    is_manager = (employee_manager == approver)

    if not (is_hr or is_manager):
        raise PermissionDenied("You are not authorized to approve or reject this leave request.")

    # 3. Idempotency rule: only PENDING requests can be approved or rejected
    if leave_request.status != LeaveRequest.Status.PENDING:
        raise ValidationError(f"Cannot {action.lower()} a request with current status '{leave_request.get_status_display()}'.")

    # 4. Action handling
    if action == ApprovalHistory.Action.APPROVED:
        year = leave_request.start_date.year
        # Row-lock the leave balance
        balance = (
            LeaveBalance.objects.select_for_update()
            .filter(
                employee=leave_request.employee,
                leave_type=leave_request.leave_type,
                year=year,
            )
            .first()
        )

        if not balance:
            balance = LeaveBalance.objects.create(
                employee=leave_request.employee,
                leave_type=leave_request.leave_type,
                year=year,
                allocated_days=leave_request.leave_type.annual_allowance,
                used_days=Decimal("0.0"),
            )

        if balance.remaining_days < leave_request.duration_days:
            raise ValidationError(
                f"Insufficient leave balance for {leave_request.employee.full_name}. "
                f"Available: {balance.remaining_days} days, Required: {leave_request.duration_days} days."
            )

        balance.used_days += leave_request.duration_days
        balance.save(update_fields=['used_days', 'updated_at'])

        leave_request.status = LeaveRequest.Status.APPROVED
        leave_request.save(update_fields=['status', 'updated_at'])

    elif action == ApprovalHistory.Action.REJECTED:
        leave_request.status = LeaveRequest.Status.REJECTED
        leave_request.save(update_fields=['status', 'updated_at'])
    else:
        raise ValidationError(f"Invalid action '{action}'. Must be APPROVED or REJECTED.")

    # 5. Record approval history
    ApprovalHistory.objects.create(
        leave_request=leave_request,
        approver=approver,
        action=action,
        comment=comment,
    )

    # 6. Notify the employee
    Notification.objects.create(
        recipient=leave_request.employee,
        title=f"Leave Request #{leave_request.id} {action}",
        message=(
            f"Your {leave_request.leave_type.name} leave from {leave_request.start_date} to {leave_request.end_date} "
            f"has been {action.lower()} by {approver.full_name}. Comment: {comment or 'None'}"
        ),
        link=f"/leaves/{leave_request.id}",
    )

    # 7. Audit log
    AuditLog.objects.create(
        actor=approver,
        action=f"LEAVE_REQUEST_{action}",
        entity_type="LeaveRequest",
        entity_id=str(leave_request.id),
        details={
            "employee_id": leave_request.employee_id,
            "employee_email": leave_request.employee.email,
            "duration": str(leave_request.duration_days),
            "comment": comment,
        },
    )

    return leave_request


@transaction.atomic
def process_leave_cancellation(leave_request_id: int, user, reason: str = "") -> LeaveRequest:
    """
    Safely cancels a pending or approved leave request, reversing balance deductions
    if the request was already approved.
    """
    try:
        leave_request = (
            LeaveRequest.objects.select_for_update()
            .select_related('employee', 'leave_type')
            .get(pk=leave_request_id)
        )
    except LeaveRequest.DoesNotExist:
        raise ValidationError(f"Leave request #{leave_request_id} does not exist.")

    # Authorization: must be the employee or HR
    if not (user == leave_request.employee or user.is_admin_or_hr):
        raise PermissionDenied("You can only cancel your own leave requests.")

    if leave_request.status not in [LeaveRequest.Status.PENDING, LeaveRequest.Status.APPROVED]:
        raise ValidationError(f"Cannot cancel a leave request with status '{leave_request.get_status_display()}'.")

    was_approved = (leave_request.status == LeaveRequest.Status.APPROVED)

    # If it was already approved, refund the used days atomically
    if was_approved:
        year = leave_request.start_date.year
        balance = (
            LeaveBalance.objects.select_for_update()
            .filter(
                employee=leave_request.employee,
                leave_type=leave_request.leave_type,
                year=year,
            )
            .first()
        )
        if balance:
            balance.used_days = max(Decimal("0.0"), balance.used_days - leave_request.duration_days)
            balance.save(update_fields=['used_days', 'updated_at'])

    leave_request.status = LeaveRequest.Status.CANCELLED
    leave_request.cancellation_reason = reason
    leave_request.cancelled_at = timezone.now()
    leave_request.save(update_fields=['status', 'cancellation_reason', 'cancelled_at', 'updated_at'])

    # Notify direct manager if present
    manager = getattr(getattr(leave_request.employee, 'profile', None), 'manager', None)
    if manager:
        Notification.objects.create(
            recipient=manager,
            title=f"Leave Request #{leave_request.id} Cancelled",
            message=(
                f"{leave_request.employee.full_name} cancelled their {leave_request.leave_type.name} leave "
                f"from {leave_request.start_date} to {leave_request.end_date}. Reason: {reason or 'None'}"
            ),
            link=f"/leaves/{leave_request.id}",
        )

    # Audit log
    AuditLog.objects.create(
        actor=user,
        action="LEAVE_REQUEST_CANCELLED",
        entity_type="LeaveRequest",
        entity_id=str(leave_request.id),
        details={
            "cancellation_reason": reason,
            "was_approved": was_approved,
            "refunded_days": str(leave_request.duration_days) if was_approved else "0.0",
        },
    )

    return leave_request
