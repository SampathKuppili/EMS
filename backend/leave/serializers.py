from decimal import Decimal
from django.utils import timezone
from rest_framework import serializers

from accounts.serializers import BasicUserSerializer
from approvals.models import ApprovalHistory
from .models import LeaveType, LeaveBalance, LeaveRequest
from .services import (
    calculate_leave_duration,
    validate_no_overlapping_requests,
    check_sufficient_balance,
)


class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        fields = [
            'id',
            'name',
            'code',
            'description',
            'annual_allowance',
            'requires_approval',
            'is_paid',
            'is_active',
            'created_at',
        ]


class LeaveBalanceSerializer(serializers.ModelSerializer):
    leave_type_name = serializers.CharField(source='leave_type.name', read_only=True)
    leave_type_code = serializers.CharField(source='leave_type.code', read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    total_allocated_days = serializers.DecimalField(max_digits=5, decimal_places=1, read_only=True)
    remaining_days = serializers.DecimalField(max_digits=5, decimal_places=1, read_only=True)

    class Meta:
        model = LeaveBalance
        fields = [
            'id',
            'employee',
            'employee_name',
            'leave_type',
            'leave_type_name',
            'leave_type_code',
            'year',
            'allocated_days',
            'carried_forward_days',
            'total_allocated_days',
            'used_days',
            'remaining_days',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'total_allocated_days', 'used_days', 'remaining_days', 'created_at', 'updated_at']


class LeaveBalanceAllocationSerializer(serializers.Serializer):
    """Used by HR to allocate or adjust an employee's leave balance."""
    employee_id = serializers.IntegerField()
    leave_type_id = serializers.IntegerField()
    year = serializers.IntegerField(default=timezone.now().year)
    allocated_days = serializers.DecimalField(max_digits=5, decimal_places=1)
    carried_forward_days = serializers.DecimalField(max_digits=5, decimal_places=1, required=False, default=Decimal('0.0'))
    used_days = serializers.DecimalField(max_digits=5, decimal_places=1, required=False, default=Decimal('0.0'))


class ApprovalHistoryNestedSerializer(serializers.ModelSerializer):
    approver_name = serializers.CharField(source='approver.full_name', read_only=True)

    class Meta:
        model = ApprovalHistory
        fields = ['id', 'approver', 'approver_name', 'action', 'comment', 'timestamp']


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee = BasicUserSerializer(read_only=True)
    leave_type = LeaveTypeSerializer(read_only=True)
    department_name = serializers.CharField(source='employee.profile.department.name', read_only=True)
    approval_history = ApprovalHistoryNestedSerializer(many=True, read_only=True)

    class Meta:
        model = LeaveRequest
        fields = [
            'id',
            'employee',
            'department_name',
            'leave_type',
            'start_date',
            'end_date',
            'duration_days',
            'reason',
            'status',
            'is_half_day',
            'submitted_at',
            'updated_at',
            'cancellation_reason',
            'cancelled_at',
            'approval_history',
        ]


class LeaveDurationPreviewSerializer(serializers.Serializer):
    """Endpoint serializer for live preview of duration calculation."""
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    is_half_day = serializers.BooleanField(default=False)


class LeaveRequestCreateSerializer(serializers.ModelSerializer):
    leave_type_id = serializers.PrimaryKeyRelatedField(
        queryset=LeaveType.objects.filter(is_active=True),
        source='leave_type',
        write_only=True,
    )

    class Meta:
        model = LeaveRequest
        fields = [
            'id',
            'leave_type_id',
            'start_date',
            'end_date',
            'reason',
            'is_half_day',
            'duration_days',
        ]
        read_only_fields = ['id', 'duration_days']

    def validate(self, attrs):
        user = self.context['request'].user
        start_date = attrs.get('start_date')
        end_date = attrs.get('end_date')
        is_half_day = attrs.get('is_half_day', False)
        leave_type = attrs.get('leave_type')

        # 1. Start date must not be after end date
        if start_date > end_date:
            raise serializers.ValidationError({'end_date': 'End date must not be earlier than start date.'})

        # 2. Check server-side leave duration
        from django.core.exceptions import ValidationError as DjangoValidationError
        try:
            duration = calculate_leave_duration(start_date, end_date, is_half_day)
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.message_dict if hasattr(e, 'message_dict') else str(e))

        attrs['duration_days'] = duration

        # 3. Overlap check
        try:
            validate_no_overlapping_requests(user, start_date, end_date)
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.message_dict if hasattr(e, 'message_dict') else str(e))

        # 4. Sufficient balance check
        try:
            check_sufficient_balance(user, leave_type, start_date.year, duration)
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.message_dict if hasattr(e, 'message_dict') else str(e))

        return attrs

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['employee'] = user
        return super().create(validated_data)
