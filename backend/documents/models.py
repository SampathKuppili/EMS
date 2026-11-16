from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class EmployeeDocument(models.Model):
    class Category(models.TextChoices):
        ID_PROOF = 'ID_PROOF', _('Identification & Address Proof')
        CONTRACT = 'CONTRACT', _('Employment Contract & Offer Letter')
        CERTIFICATE = 'CERTIFICATE', _('Academic & Professional Certificates')
        TAX_DOCUMENT = 'TAX_DOCUMENT', _('Tax & Financial Form')
        OTHER = 'OTHER', _('Other Document')

    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='documents',
        verbose_name=_('employee'),
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_documents',
        verbose_name=_('uploaded by'),
    )
    title = models.CharField(_('title'), max_length=200)
    category = models.CharField(
        _('category'),
        max_length=30,
        choices=Category.choices,
        default=Category.OTHER,
    )
    file = models.FileField(_('file'), upload_to='documents/%Y/%m/')
    file_size = models.PositiveIntegerField(_('file size in bytes'), null=True, blank=True)
    file_type = models.CharField(_('file mime/extension'), max_length=100, blank=True)
    notes = models.TextField(_('notes'), blank=True)
    expiry_date = models.DateField(_('expiry date'), null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = _('employee document')
        verbose_name_plural = _('employee documents')

    def __str__(self):
        return f"{self.title} - {self.employee.full_name}"
