from django.contrib import admin
from leave.models import LeaveType, LeaveBalance, LeaveRequest


@admin.register(LeaveType)
class LeaveTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'annual_allowance', 'requires_approval', 'is_paid', 'is_active')
    list_filter = ('is_active', 'requires_approval', 'is_paid')
    search_fields = ('name', 'code')


@admin.register(LeaveBalance)
class LeaveBalanceAdmin(admin.ModelAdmin):
    list_display = ('employee', 'leave_type', 'year', 'allocated_days', 'used_days', 'remaining_days')
    list_filter = ('year', 'leave_type')
    search_fields = ('employee__email', 'employee__first_name', 'employee__last_name')


@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'employee', 'leave_type', 'start_date', 'end_date', 'duration_days', 'status', 'submitted_at')
    list_filter = ('status', 'leave_type', 'is_half_day')
    search_fields = ('employee__email', 'employee__first_name', 'employee__last_name', 'reason')
    date_hierarchy = 'start_date'
