from django.contrib import admin
from approvals.models import ApprovalHistory


@admin.register(ApprovalHistory)
class ApprovalHistoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'leave_request', 'approver', 'action', 'timestamp')
    list_filter = ('action', 'timestamp')
    search_fields = ('approver__email', 'leave_request__employee__email', 'comment')
