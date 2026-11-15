from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class Notification(models.Model):
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name=_('recipient'),
    )
    title = models.CharField(_('title'), max_length=200)
    message = models.TextField(_('message'))
    link = models.CharField(_('link'), max_length=255, blank=True)
    is_read = models.BooleanField(_('is read'), default=False, db_index=True)
    read_at = models.DateTimeField(_('read at'), null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = _('notification')
        verbose_name_plural = _('notifications')

    def __str__(self):
        return f"Notification for {self.recipient.email}: {self.title}"

    def mark_as_read(self):
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])
