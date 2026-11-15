from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Department(models.Model):
    name = models.CharField(_('name'), max_length=100, unique=True)
    description = models.TextField(_('description'), blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name = _('department')
        verbose_name_plural = _('departments')

    def __str__(self):
        return self.name


class EmployeeProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile',
        verbose_name=_('user'),
    )
    employee_code = models.CharField(
        _('employee code'),
        max_length=30,
        unique=True,
        db_index=True,
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='employees',
        verbose_name=_('department'),
    )
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_employees',
        verbose_name=_('reporting manager'),
    )
    designation = models.CharField(_('designation'), max_length=100, blank=True)
    joining_date = models.DateField(_('joining date'), null=True, blank=True)
    phone_number = models.CharField(_('phone number'), max_length=20, blank=True)
    address = models.TextField(_('address'), blank=True)
    emergency_contact = models.CharField(_('emergency contact'), max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['employee_code']
        verbose_name = _('employee profile')
        verbose_name_plural = _('employee profiles')

    def __str__(self):
        return f"{self.employee_code} - {self.user.full_name}"


class Holiday(models.Model):
    date = models.DateField(_('date'), unique=True, db_index=True)
    name = models.CharField(_('holiday name'), max_length=150)
    description = models.TextField(_('description'), blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date']
        verbose_name = _('holiday')
        verbose_name_plural = _('holidays')

    def __str__(self):
        return f"{self.date} - {self.name}"
