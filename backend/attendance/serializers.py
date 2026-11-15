from rest_framework import serializers

from .models import AttendanceRecord


class AttendanceRecordSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    employee_email = serializers.SerializerMethodField()
    employee_code = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_checked_in = serializers.BooleanField(read_only=True)
    is_completed = serializers.BooleanField(read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = [
            'id',
            'employee',
            'employee_name',
            'employee_email',
            'employee_code',
            'department_name',
            'date',
            'check_in',
            'check_out',
            'status',
            'status_display',
            'work_duration_hours',
            'ip_address',
            'notes',
            'is_checked_in',
            'is_completed',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'employee',
            'employee_name',
            'employee_email',
            'employee_code',
            'department_name',
            'status_display',
            'work_duration_hours',
            'ip_address',
            'is_checked_in',
            'is_completed',
            'created_at',
            'updated_at',
        ]

    def get_employee_name(self, obj) -> str:
        return obj.employee.full_name if obj.employee else ""

    def get_employee_email(self, obj) -> str:
        return obj.employee.email if obj.employee else ""

    def get_employee_code(self, obj) -> str:
        profile = getattr(obj.employee, 'profile', None)
        return profile.employee_code if profile else ""

    def get_department_name(self, obj) -> str:
        profile = getattr(obj.employee, 'profile', None)
        if profile and profile.department:
            return profile.department.name
        return ""


class TodayAttendanceStatusSerializer(serializers.Serializer):
    date = serializers.DateField()
    status_label = serializers.CharField()
    can_check_in = serializers.BooleanField()
    can_check_out = serializers.BooleanField()
    is_holiday = serializers.BooleanField()
    holiday_name = serializers.CharField(allow_null=True, required=False)
    is_weekend = serializers.BooleanField()
    is_on_leave = serializers.BooleanField()
    leave_name = serializers.CharField(allow_null=True, required=False)
    is_half_day_leave = serializers.BooleanField()
    record = AttendanceRecordSerializer(allow_null=True)
    elapsed_seconds = serializers.IntegerField(default=0)


class CheckInActionSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class CheckOutActionSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class AutoClassifyRequestSerializer(serializers.Serializer):
    date = serializers.DateField(required=False, default=None)


class AttendanceSummarySerializer(serializers.Serializer):
    period_start = serializers.DateField()
    period_end = serializers.DateField()
    total_records = serializers.IntegerField()
    present_days = serializers.IntegerField()
    half_days = serializers.IntegerField()
    on_leave_days = serializers.IntegerField()
    absent_days = serializers.IntegerField()
    holiday_days = serializers.IntegerField()
    weekend_days = serializers.IntegerField()
    total_work_hours = serializers.DecimalField(max_digits=7, decimal_places=2)
    avg_work_hours_per_present_day = serializers.DecimalField(max_digits=5, decimal_places=2)
