from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class ReimbursementClaim(models.Model):
    class Category(models.TextChoices):
        TRAVEL = 'TRAVEL', _('Travel & Conveyance')
        FOOD = 'FOOD', _('Meals & Food')
        MEALS = 'MEALS', _('Meals & Subsistence')
        EQUIPMENT = 'EQUIPMENT', _('Equipment & Hardware')
        OFFICE_SUPPLIES = 'OFFICE_SUPPLIES', _('Office Supplies & Stationery')
        TRAINING = 'TRAINING', _('Training & Certification')
        MEDICAL = 'MEDICAL', _('Health & Medical')
        HEALTH_WELLNESS = 'HEALTH_WELLNESS', _('Health & Wellness')
        CLIENT_ENTERTAINMENT = 'CLIENT_ENTERTAINMENT', _('Client Entertainment')
        OTHER = 'OTHER', _('Other General')

    class Status(models.TextChoices):
        PENDING = 'PENDING', _('Pending Approval')
        APPROVED = 'APPROVED', _('Approved')
        REJECTED = 'REJECTED', _('Rejected')
        PAID = 'PAID', _('Paid')

    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reimbursements',
        verbose_name=_('employee'),
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_reimbursements',
        verbose_name=_('reviewed by'),
    )
    title = models.CharField(_('title / expense item'), max_length=200)
    category = models.CharField(
        _('category'),
        max_length=30,
        choices=Category.choices,
        default=Category.OTHER,
    )
    amount = models.DecimalField(_('claim amount'), max_digits=12, decimal_places=2)
    currency = models.CharField(_('currency'), max_length=10, default='INR')
    expense_date = models.DateField(_('date of expense'))
    merchant = models.CharField(_('vendor / merchant name'), max_length=150, blank=True)
    description = models.TextField(_('justification / description'), blank=True)
    receipt = models.FileField(_('bill / receipt file'), upload_to='receipts/%Y/%m/', null=True, blank=True)
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    review_notes = models.TextField(_('approver comments / rejection reason'), blank=True)
    payment_reference = models.CharField(_('payment reference'), max_length=100, blank=True)
    reviewed_at = models.DateTimeField(_('reviewed at'), null=True, blank=True)
    paid_at = models.DateTimeField(_('paid at'), null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def claim_number(self):
        return f"CLM-{self.id:05d}"

    class Meta:
        ordering = ['-expense_date', '-created_at']
        verbose_name = _('reimbursement claim')
        verbose_name_plural = _('reimbursement claims')

    def __str__(self):
        return f"{self.title} ({self.currency} {self.amount}) - {self.employee.full_name} [{self.status}]"
