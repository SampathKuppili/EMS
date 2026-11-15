from decimal import Decimal
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class AttendanceRecord(models.Model):
    class Status(models.TextChoices):
        PRESENT = 'PRESENT', _('Present')
        HALF_DAY = 'HALF_DAY', _('Half Day')
        ON_LEAVE = 'ON_LEAVE', _('On Leave')
        ABSENT = 'ABSENT', _('Absent')
        UNPAID_LEAVE = 'UNPAID_LEAVE', _('Unpaid Leave')
        HOLIDAY = 'HOLIDAY', _('Holiday')
        WEEKEND = 'WEEKEND', _('Weekend')

    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='attendance_records',
        verbose_name=_('employee'),
    )
    date = models.DateField(_('date'), db_index=True)
    check_in = models.DateTimeField(_('check-in time'), null=True, blank=True)
    check_out = models.DateTimeField(_('check-out time'), null=True, blank=True)
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=Status.choices,
        default=Status.PRESENT,
        db_index=True,
    )
    work_duration_hours = models.DecimalField(
        _('work duration (hours)'),
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
    )
    ip_address = models.CharField(_('IP address'), max_length=45, blank=True)
    notes = models.TextField(_('notes'), blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-check_in']
        constraints = [
            models.UniqueConstraint(
                fields=['employee', 'date'],
                name='unique_employee_attendance_date',
            )
        ]
        verbose_name = _('attendance record')
        verbose_name_plural = _('attendance records')

    def __str__(self):
        return f"{self.employee.email} - {self.date} [{self.status}]"

    @property
    def is_checked_in(self) -> bool:
        return self.check_in is not None and self.check_out is None

    @property
    def is_completed(self) -> bool:
        return self.check_in is not None and self.check_out is not None

    def calculate_duration(self) -> Decimal:
        if self.check_in and self.check_out:
            delta = self.check_out - self.check_in
            hours = Decimal(str(round(delta.total_seconds() / 3600.0, 2)))
            return max(Decimal('0.00'), hours)
        return Decimal('0.00')
