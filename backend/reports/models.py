from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class AuditLog(models.Model):
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
        verbose_name=_('actor'),
    )
    action = models.CharField(_('action'), max_length=100, db_index=True)
    entity_type = models.CharField(_('entity type'), max_length=100, db_index=True)
    entity_id = models.CharField(_('entity ID'), max_length=100, blank=True)
    details = models.JSONField(_('details'), default=dict, blank=True)
    ip_address = models.GenericIPAddressField(_('IP address'), null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = _('audit log')
        verbose_name_plural = _('audit logs')

    def __str__(self):
        actor_email = self.actor.email if self.actor else 'System'
        return f"[{self.timestamp:%Y-%m-%d %H:%M:%S}] {actor_email} - {self.action} on {self.entity_type} #{self.entity_id}"
