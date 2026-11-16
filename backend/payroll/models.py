from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class SalaryStructure(models.Model):
    class PayFrequency(models.TextChoices):
        MONTHLY = 'MONTHLY', _('Monthly')
        BI_WEEKLY = 'BI_WEEKLY', _('Bi-Weekly')

    employee = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='salary_structure',
        verbose_name=_('employee'),
    )
    currency = models.CharField(_('currency code'), max_length=10, default='INR')
    base_salary = models.DecimalField(_('base annual / monthly CTC'), max_digits=12, decimal_places=2)
    pay_frequency = models.CharField(
        _('pay frequency'),
        max_length=20,
        choices=PayFrequency.choices,
        default=PayFrequency.MONTHLY,
    )
    effective_date = models.DateField(_('effective date'), default=timezone.now)
    is_active = models.BooleanField(_('is active'), default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-effective_date']
        verbose_name = _('salary structure')
        verbose_name_plural = _('salary structures')

    def __str__(self):
        return f"{self.employee.full_name} - {self.currency} {self.base_salary}"


class SalaryComponent(models.Model):
    class ComponentType(models.TextChoices):
        EARNING = 'EARNING', _('Earning / Allowance')
        DEDUCTION = 'DEDUCTION', _('Tax / Statutory Deduction')

    class CalculationType(models.TextChoices):
        FIXED = 'FIXED', _('Fixed Monthly Amount')
        PERCENTAGE = 'PERCENTAGE', _('Percentage of Base Salary')

    salary_structure = models.ForeignKey(
        SalaryStructure,
        on_delete=models.CASCADE,
        related_name='components',
        verbose_name=_('salary structure'),
    )
    name = models.CharField(_('component name'), max_length=100)
    component_type = models.CharField(
        _('type'),
        max_length=20,
        choices=ComponentType.choices,
        default=ComponentType.EARNING,
    )
    calculation_type = models.CharField(
        _('calculation mode'),
        max_length=20,
        choices=CalculationType.choices,
        default=CalculationType.FIXED,
    )
    amount = models.DecimalField(_('amount or percentage value'), max_digits=12, decimal_places=2)
    is_taxable = models.BooleanField(_('subject to tax'), default=True)
    order = models.PositiveIntegerField(_('display order'), default=0)

    class Meta:
        ordering = ['component_type', 'order', 'name']
        verbose_name = _('salary component')
        verbose_name_plural = _('salary components')

    def __str__(self):
        return f"{self.name} ({self.get_component_type_display()}): {self.amount}"


class TaxDeduction(models.Model):
    class TaxRegime(models.TextChoices):
        NEW_REGIME = 'NEW_REGIME', _('Simplified New Tax Regime')
        OLD_REGIME = 'OLD_REGIME', _('Traditional Old Regime (With Exemptions)')
        STANDARD = 'STANDARD', _('Standard Flat Rate / Corporate')

    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tax_deductions',
        verbose_name=_('employee'),
    )
    tax_year = models.PositiveIntegerField(_('assessment tax year'), default=2026)
    pan_or_tax_id = models.CharField(_('PAN / Taxpayer ID'), max_length=50, blank=True)
    tax_regime = models.CharField(
        _('tax regime'),
        max_length=30,
        choices=TaxRegime.choices,
        default=TaxRegime.NEW_REGIME,
    )
    tds_monthly_deduction = models.DecimalField(
        _('estimated monthly TDS deduction'),
        max_digits=10,
        decimal_places=2,
        default=0.00,
    )
    declared_investments = models.DecimalField(
        _('annual declared tax-saving investments'),
        max_digits=12,
        decimal_places=2,
        default=0.00,
    )
    notes = models.TextField(_('tax notes & declarations'), blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-tax_year']
        unique_together = ('employee', 'tax_year')
        verbose_name = _('tax deduction profile')
        verbose_name_plural = _('tax deduction profiles')

    def __str__(self):
        return f"{self.employee.full_name} - Tax Year {self.tax_year} ({self.tax_regime})"


class PayslipTemplate(models.Model):
    class Theme(models.TextChoices):
        MODERN_CLEAN = 'MODERN_CLEAN', _('Modern Clean (Slate & Indigo)')
        CORPORATE_CLASSIC = 'CORPORATE_CLASSIC', _('Corporate Classic (Formal Navy)')
        COMPACT_MINIMAL = 'COMPACT_MINIMAL', _('Compact Minimalist (Monochrome)')

    name = models.CharField(_('template name'), max_length=100)
    theme_code = models.CharField(
        _('theme preset'),
        max_length=30,
        choices=Theme.choices,
        default=Theme.MODERN_CLEAN,
    )
    company_name = models.CharField(
        _('company name'),
        max_length=150,
        default='LeaveFlow Enterprise EMS',
    )
    company_address = models.TextField(
        _('company address / header'),
        blank=True,
        default='Tech Innovation Square, Suite 400, Cyber City',
    )
    company_logo_url = models.URLField(_('company logo URL'), blank=True)
    footer_notes = models.TextField(
        _('footer notes / disclaimer'),
        blank=True,
        default='This is a confidential computer-generated payslip and does not require a physical signature.',
    )
    accent_color = models.CharField(_('accent brand hex color'), max_length=20, default='#4F46E5')
    is_default = models.BooleanField(_('default template'), default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_payslip_templates',
        verbose_name=_('created by'),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_default', 'name']
        verbose_name = _('payslip template')
        verbose_name_plural = _('payslip templates')

    def save(self, *args, **kwargs):
        if self.is_default:
            PayslipTemplate.objects.exclude(id=self.id).update(is_default=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} [{'Default' if self.is_default else self.theme_code}]"


class Payslip(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', _('Draft')
        PUBLISHED = 'PUBLISHED', _('Published')
        PAID = 'PAID', _('Paid')

    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='payslips',
        verbose_name=_('employee'),
    )
    template = models.ForeignKey(
        PayslipTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payslips',
        verbose_name=_('payslip template'),
    )
    month = models.PositiveSmallIntegerField(_('month (1-12)'))
    year = models.PositiveIntegerField(_('year'))
    payment_date = models.DateField(_('payment date'))
    currency = models.CharField(_('currency code'), max_length=10, default='INR')
    basic_salary = models.DecimalField(_('basic salary'), max_digits=12, decimal_places=2)
    total_earnings = models.DecimalField(_('gross earnings'), max_digits=12, decimal_places=2)
    total_deductions = models.DecimalField(_('total deductions'), max_digits=12, decimal_places=2)
    net_salary = models.DecimalField(_('net take-home salary'), max_digits=12, decimal_places=2)
    earnings_breakdown = models.JSONField(
        _('itemized earnings JSON'),
        default=list,
        help_text='List of objects with name, amount',
    )
    deductions_breakdown = models.JSONField(
        _('itemized deductions JSON'),
        default=list,
        help_text='List of objects with name, amount',
    )
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=Status.choices,
        default=Status.PUBLISHED,
        db_index=True,
    )
    working_days = models.PositiveSmallIntegerField(_('standard working days in month'), default=30)
    paid_days = models.DecimalField(_('days paid'), max_digits=5, decimal_places=1, default=30.0)
    notes = models.TextField(_('remarks / personal payroll note'), blank=True)
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='generated_payslips',
        verbose_name=_('generated by'),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-year', '-month', '-payment_date']
        unique_together = ('employee', 'month', 'year')
        verbose_name = _('payslip')
        verbose_name_plural = _('payslips')

    def __str__(self):
        return f"Payslip: {self.employee.full_name} ({self.month}/{self.year}) - {self.currency} {self.net_salary}"
