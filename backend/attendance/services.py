from datetime import date
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from accounts.models import User
from .models import AttendanceRecord
from leave.models import LeaveRequest
from organization.models import Holiday


def get_today_attendance_status(employee: User, target_date: date = None) -> dict:
    """
    Returns current day's attendance status, active record, and context flags
    (e.g. holiday, approved leave, weekend, check-in eligibility).
    """
    if target_date is None:
        target_date = timezone.localdate()

    # 1. Existing record?
    record = AttendanceRecord.objects.filter(employee=employee, date=target_date).first()

    # 2. Check if holiday
    holiday = Holiday.objects.filter(date=target_date).first()

    # 3. Check if weekend
    is_weekend = target_date.weekday() in (5, 6)

    # 4. Check if approved leave exists
    leave = LeaveRequest.objects.filter(
        employee=employee,
        status=LeaveRequest.Status.APPROVED,
        start_date__lte=target_date,
        end_date__gte=target_date,
    ).select_related('leave_type').first()

    can_check_in = False
    can_check_out = False
    status_label = "NOT_CHECKED_IN"

    if record:
        if record.is_checked_in:
            can_check_out = True
            status_label = "CHECKED_IN"
        elif record.is_completed:
            status_label = "COMPLETED"
        else:
            status_label = record.status
    else:
        # No record yet
        if holiday:
            status_label = "HOLIDAY"
            can_check_in = True
        elif is_weekend:
            status_label = "WEEKEND"
            can_check_in = True
        elif leave:
            status_label = "ON_LEAVE"
            if leave.is_half_day:
                can_check_in = True
        else:
            can_check_in = True
            status_label = "NOT_CHECKED_IN"

    return {
        "date": target_date,
        "record": record,
        "status_label": status_label,
        "can_check_in": can_check_in,
        "can_check_out": can_check_out,
        "is_holiday": holiday is not None,
        "holiday_name": holiday.name if holiday else None,
        "is_weekend": is_weekend,
        "is_on_leave": leave is not None,
        "leave_name": leave.leave_type.name if leave else None,
        "is_half_day_leave": leave.is_half_day if leave else False,
    }


@transaction.atomic
def check_in_employee(employee: User, ip_address: str = "", notes: str = "") -> AttendanceRecord:
    """
    Marks employee as checked in (PRESENT) for today.
    Validates that user hasn't already checked in or isn't on full-day leave.
    """
    today = timezone.localdate()
    now = timezone.now()

    # Check for existing record
    record = AttendanceRecord.objects.select_for_update().filter(employee=employee, date=today).first()
    if record and record.check_in is not None:
        formatted_time = timezone.localtime(record.check_in).strftime('%I:%M %p')
        raise ValidationError({
            "check_in": f"You have already checked in today at {formatted_time}."
        })

    # Check for full-day approved leave
    full_day_leave = LeaveRequest.objects.filter(
        employee=employee,
        status=LeaveRequest.Status.APPROVED,
        start_date__lte=today,
        end_date__gte=today,
        is_half_day=False,
    ).first()
    if full_day_leave:
        raise ValidationError({
            "check_in": f"You are scheduled on approved {full_day_leave.leave_type.name} today."
        })

    if not record:
        record = AttendanceRecord(
            employee=employee,
            date=today,
            check_in=now,
            status=AttendanceRecord.Status.PRESENT,
            ip_address=ip_address,
            notes=notes or "Web check-in",
        )
    else:
        record.check_in = now
        record.status = AttendanceRecord.Status.PRESENT
        if ip_address:
            record.ip_address = ip_address
        if notes:
            record.notes = notes

    record.save()
    return record


@transaction.atomic
def check_out_employee(employee: User, notes: str = "") -> AttendanceRecord:
    """
    Marks employee as checked out for today, computes total work hours,
    and assigns final status (PRESENT or HALF_DAY).
    """
    today = timezone.localdate()
    now = timezone.now()

    record = AttendanceRecord.objects.select_for_update().filter(employee=employee, date=today).first()
    if not record or record.check_in is None:
        raise ValidationError({"check_out": "Cannot check out without checking in first."})

    if record.check_out is not None:
        formatted_time = timezone.localtime(record.check_out).strftime('%I:%M %p')
        raise ValidationError({
            "check_out": f"You have already checked out today at {formatted_time}."
        })

    record.check_out = now
    duration = record.calculate_duration()
    record.work_duration_hours = duration

    # Business rule: Full day threshold 7.5 hrs; Half day threshold 4.0 hrs
    if duration >= Decimal('7.50'):
        record.status = AttendanceRecord.Status.PRESENT
    elif duration >= Decimal('4.00'):
        record.status = AttendanceRecord.Status.HALF_DAY
    else:
        record.status = AttendanceRecord.Status.HALF_DAY
        if not notes:
            notes = f"Short work session: {duration} hrs worked"

    if notes:
        record.notes = f"{record.notes}; {notes}" if record.notes else notes

    record.save()
    return record


def auto_classify_absences_for_date(target_date: date = None) -> int:
    """
    Automated classification: For any active employee without an attendance record on target_date:
    1. If holiday -> HOLIDAY
    2. If weekend -> WEEKEND
    3. If approved leave -> ON_LEAVE
    4. Otherwise -> ABSENT
    Returns count of records created or updated.
    """
    if target_date is None:
        target_date = timezone.localdate()

    is_holiday = Holiday.objects.filter(date=target_date).exists()
    is_weekend = target_date.weekday() in (5, 6)
    holiday_obj = Holiday.objects.filter(date=target_date).first()

    active_employees = User.objects.filter(is_active=True).exclude(
        attendance_records__date=target_date
    )

    created_count = 0
    records_to_create = []

    # Map approved leaves for target_date
    approved_leaves = {
        lr.employee_id: lr
        for lr in LeaveRequest.objects.filter(
            status=LeaveRequest.Status.APPROVED,
            start_date__lte=target_date,
            end_date__gte=target_date,
        ).select_related('leave_type')
    }

    for emp in active_employees:
        if is_holiday:
            status = AttendanceRecord.Status.HOLIDAY
            notes = f"Company Holiday: {holiday_obj.name}"
        elif is_weekend:
            status = AttendanceRecord.Status.WEEKEND
            notes = "Scheduled Weekend"
        elif emp.id in approved_leaves:
            leave = approved_leaves[emp.id]
            status = AttendanceRecord.Status.ON_LEAVE
            notes = f"Approved Leave: {leave.leave_type.name}"
        else:
            status = AttendanceRecord.Status.ABSENT
            notes = "Auto-classified: Absent (No check-in recorded)"

        records_to_create.append(
            AttendanceRecord(
                employee=emp,
                date=target_date,
                status=status,
                notes=notes,
                work_duration_hours=Decimal('0.00'),
            )
        )

    if records_to_create:
        AttendanceRecord.objects.bulk_create(records_to_create, ignore_conflicts=True)
        created_count = len(records_to_create)

    return created_count
