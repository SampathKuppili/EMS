from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _
from leave.models import LeaveRequest


class ApprovalHistory(models.Model):
    class Action(models.TextChoices):
        APPROVED = 'APPROVED', _('Approved')
        REJECTED = 'REJECTED', _('Rejected')

    leave_request = models.ForeignKey(
        LeaveRequest,
        on_delete=models.CASCADE,
        related_name='approval_history',
        verbose_name=_('leave request'),
    )
    approver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='approvals_made',
        verbose_name=_('approver'),
    )
    action = models.CharField(
        _('action'),
        max_length=20,
        choices=Action.choices,
    )
    comment = models.TextField(_('comment'), blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = _('approval history')
        verbose_name_plural = _('approval histories')

    def __str__(self):
        return f"{self.action} by {self.approver.email} on Req #{self.leave_request_id}"
