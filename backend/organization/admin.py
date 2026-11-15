from django.contrib import admin
from organization.models import Department, EmployeeProfile, Holiday


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'created_at')
    search_fields = ('name',)


@admin.register(EmployeeProfile)
class EmployeeProfileAdmin(admin.ModelAdmin):
    list_display = ('employee_code', 'user', 'department', 'manager', 'designation', 'joining_date')
    list_filter = ('department', 'manager')
    search_fields = ('employee_code', 'user__email', 'user__first_name', 'user__last_name', 'designation')


@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    list_display = ('date', 'name', 'description')
    ordering = ('date',)
