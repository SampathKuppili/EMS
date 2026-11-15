from datetime import date, timedelta
from decimal import Decimal
from typing import Tuple
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from organization.models import Holiday
from leave.models import LeaveBalance, LeaveRequest, LeaveType


def calculate_leave_duration(
    start_date: date,
    end_date: date,
    is_half_day: bool = False,
) -> Decimal:
    """
    Computes working days between start_date and end_date (inclusive),
    excluding weekends (Saturday, Sunday) and official company holidays.
    """
    if start_date > end_date:
        raise ValidationError({"end_date": "End date cannot be earlier than start date."})

    if is_half_day:
        if start_date != end_date:
            raise ValidationError({"is_half_day": "Half-day leave must start and end on the same day."})
        if start_date.weekday() in (5, 6):
            raise ValidationError({"start_date": "Half-day cannot be taken on a weekend."})
        if Holiday.objects.filter(date=start_date).exists():
            raise ValidationError({"start_date": "Half-day cannot be taken on a public holiday."})
        return Decimal("0.5")

    # Fetch holidays falling within the period in one query
    holiday_dates = set(
        Holiday.objects.filter(date__range=(start_date, end_date)).values_list("date", flat=True)
    )

    working_days = 0
    curr = start_date
    one_day = timedelta(days=1)
    while curr <= end_date:
        # Exclude Saturday (5) and Sunday (6)
        if curr.weekday() not in (5, 6) and curr not in holiday_dates:
            working_days += 1
        curr += one_day

    if working_days == 0:
        raise ValidationError({
            "non_field_errors": [
                "The selected dates contain 0 working days (dates fall entirely on weekends or public holidays)."
            ]
        })

    return Decimal(str(working_days))


def validate_no_overlapping_requests(
    employee,
    start_date: date,
    end_date: date,
    exclude_request_id: int = None,
):
    """
    Ensures an employee cannot submit overlapping requests for active leaves
    (status PENDING or APPROVED).
    """
    qs = LeaveRequest.objects.filter(
        employee=employee,
        status__in=[LeaveRequest.Status.PENDING, LeaveRequest.Status.APPROVED],
        start_date__lte=end_date,
        end_date__gte=start_date,
    )
    if exclude_request_id:
        qs = qs.exclude(pk=exclude_request_id)

    if qs.exists():
        overlap = qs.first()
        raise ValidationError({
            "non_field_errors": [
                f"You already have a {overlap.get_status_display().lower()} leave request "
                f"(#{overlap.id}) from {overlap.start_date} to {overlap.end_date} that overlaps with these dates."
            ]
        })


def get_or_create_leave_balance(employee, leave_type: LeaveType, year: int) -> LeaveBalance:
    """
    Returns an existing balance or initializes one using the leave type's annual allowance.
    """
    balance, created = LeaveBalance.objects.get_or_create(
        employee=employee,
        leave_type=leave_type,
        year=year,
        defaults={
            "allocated_days": leave_type.annual_allowance,
            "used_days": Decimal("0.0"),
        },
    )
    return balance


def check_sufficient_balance(employee, leave_type: LeaveType, year: int, required_days: Decimal) -> LeaveBalance:
    """
    Verifies that the employee has enough remaining leave balance.
    """
    balance = get_or_create_leave_balance(employee, leave_type, year)
    if balance.remaining_days < required_days:
        raise ValidationError({
            "leave_type": [
                f"Insufficient leave balance for {leave_type.name}. "
                f"Required: {required_days} day(s), Available: {balance.remaining_days} day(s)."
            ]
        })
    return balance
