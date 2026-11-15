from decimal import Decimal
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class LeaveType(models.Model):
    name = models.CharField(_('name'), max_length=100, unique=True)
    code = models.CharField(_('code'), max_length=20, unique=True)
    description = models.TextField(_('description'), blank=True)
    annual_allowance = models.DecimalField(
        _('annual allowance (days)'),
        max_digits=5,
        decimal_places=1,
        default=Decimal('12.0'),
    )
    requires_approval = models.BooleanField(_('requires approval'), default=True)
    is_paid = models.BooleanField(_('is paid leave'), default=True)
    is_active = models.BooleanField(_('is active'), default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        verbose_name = _('leave type')
        verbose_name_plural = _('leave types')

    def __str__(self):
        return f"{self.name} ({self.code})"


class LeaveBalance(models.Model):
    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='leave_balances',
        verbose_name=_('employee'),
    )
    leave_type = models.ForeignKey(
        LeaveType,
        on_delete=models.CASCADE,
        related_name='balances',
        verbose_name=_('leave type'),
    )
    year = models.PositiveIntegerField(
        _('year'),
        default=timezone.now().year,
        db_index=True,
    )
    allocated_days = models.DecimalField(
        _('allocated days'),
        max_digits=5,
        decimal_places=1,
        default=Decimal('0.0'),
    )
    carried_forward_days = models.DecimalField(
        _('carried forward days'),
        max_digits=5,
        decimal_places=1,
        default=Decimal('0.0'),
    )
    used_days = models.DecimalField(
        _('used days'),
        max_digits=5,
        decimal_places=1,
        default=Decimal('0.0'),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-year', 'leave_type']
        constraints = [
            models.UniqueConstraint(
                fields=['employee', 'leave_type', 'year'],
                name='unique_employee_leave_type_year',
            )
        ]
        verbose_name = _('leave balance')
        verbose_name_plural = _('leave balances')

    def __str__(self):
        return f"{self.employee.email} - {self.leave_type.code} ({self.year}): {self.remaining_days} days left"

    @property
    def total_allocated_days(self) -> Decimal:
        return self.allocated_days + self.carried_forward_days

    @property
    def remaining_days(self) -> Decimal:
        return (self.allocated_days + self.carried_forward_days) - self.used_days


class LeaveRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', _('Pending')
        APPROVED = 'APPROVED', _('Approved')
        REJECTED = 'REJECTED', _('Rejected')
        CANCELLED = 'CANCELLED', _('Cancelled')

    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='leave_requests',
        verbose_name=_('employee'),
    )
    leave_type = models.ForeignKey(
        LeaveType,
        on_delete=models.PROTECT,
        related_name='requests',
        verbose_name=_('leave type'),
    )
    start_date = models.DateField(_('start date'), db_index=True)
    end_date = models.DateField(_('end date'), db_index=True)
    duration_days = models.DecimalField(
        _('duration (days)'),
        max_digits=5,
        decimal_places=1,
        default=Decimal('1.0'),
    )
    reason = models.TextField(_('reason'))
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    is_half_day = models.BooleanField(_('half day'), default=False)
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    cancellation_reason = models.TextField(_('cancellation reason'), blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-submitted_at']
        verbose_name = _('leave request')
        verbose_name_plural = _('leave requests')

    def __str__(self):
        return f"Req #{self.pk} - {self.employee.email} ({self.leave_type.code}) [{self.status}]"

    def clean(self):
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValidationError({'end_date': _('End date must not be before start date.')})
