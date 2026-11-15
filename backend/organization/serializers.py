from rest_framework import serializers
from organization.models import Department, EmployeeProfile, Holiday
from accounts.serializers import BasicUserSerializer


class DepartmentSerializer(serializers.ModelSerializer):
    employee_count = serializers.IntegerField(source='employees.count', read_only=True)

    class Meta:
        model = Department
        fields = ['id', 'name', 'description', 'employee_count', 'created_at', 'updated_at']


class HolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = Holiday
        fields = ['id', 'date', 'name', 'description', 'created_at']


class EmployeeProfileSerializer(serializers.ModelSerializer):
    user_details = BasicUserSerializer(source='user', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    manager_name = serializers.CharField(source='manager.full_name', read_only=True)

    class Meta:
        model = EmployeeProfile
        fields = [
            'id',
            'user',
            'user_details',
            'employee_code',
            'department',
            'department_name',
            'manager',
            'manager_name',
            'designation',
            'joining_date',
            'phone_number',
            'address',
            'emergency_contact',
            'created_at',
            'updated_at',
        ]
