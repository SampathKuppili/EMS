from django.contrib import admin
from reports.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'timestamp', 'actor', 'action', 'entity_type', 'entity_id')
    list_filter = ('action', 'entity_type', 'timestamp')
    search_fields = ('actor__email', 'entity_id', 'action')
    readonly_fields = ('timestamp', 'actor', 'action', 'entity_type', 'entity_id', 'details', 'ip_address')
