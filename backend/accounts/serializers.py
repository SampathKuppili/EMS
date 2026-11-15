from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from accounts.models import User
from organization.models import EmployeeProfile, Department


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Adds user role and details to the JWT token response."""

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        data['user'] = {
            'id': user.id,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'full_name': user.full_name,
            'role': user.role,
            'is_admin': user.is_admin,
            'is_hr': user.is_hr,
            'is_manager': user.is_manager,
            'is_employee': user.is_employee,
            'is_intern': user.is_intern,
        }
        return data


class BasicUserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'full_name', 'role', 'is_active']
        read_only_fields = ['id', 'email', 'role', 'is_active']


class EmployeeProfileNestedSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    manager_name = serializers.CharField(source='manager.full_name', read_only=True)
    manager_email = serializers.CharField(source='manager.email', read_only=True)

    class Meta:
        model = EmployeeProfile
        fields = [
            'id',
            'employee_code',
            'department',
            'department_name',
            'manager',
            'manager_name',
            'manager_email',
            'designation',
            'joining_date',
            'phone_number',
            'address',
            'emergency_contact',
            'created_at',
            'updated_at',
        ]


class UserDetailSerializer(serializers.ModelSerializer):
    profile = EmployeeProfileNestedSerializer(read_only=True)
    full_name = serializers.CharField(read_only=True)
    is_admin = serializers.BooleanField(read_only=True)
    is_hr = serializers.BooleanField(read_only=True)
    is_manager = serializers.BooleanField(read_only=True)
    is_employee = serializers.BooleanField(read_only=True)
    is_intern = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'role',
            'is_active',
            'is_staff',
            'is_admin',
            'is_hr',
            'is_manager',
            'is_employee',
            'is_intern',
            'date_joined',
            'profile',
        ]
        read_only_fields = ['id', 'email', 'role', 'is_staff', 'date_joined']


class EmployeeSelfUpdateSerializer(serializers.ModelSerializer):
    """Permits employee to update personal contact info and name."""
    phone_number = serializers.CharField(source='profile.phone_number', required=False, allow_blank=True)
    address = serializers.CharField(source='profile.address', required=False, allow_blank=True)
    emergency_contact = serializers.CharField(source='profile.emergency_contact', required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone_number', 'address', 'emergency_contact']

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.save()

        profile, _ = EmployeeProfile.objects.get_or_create(
            user=instance,
            defaults={'employee_code': f"EMP-{instance.id:04d}"}
        )
        for attr, value in profile_data.items():
            setattr(profile, attr, value)
        profile.save()
        return instance


class HRUserCreateUpdateSerializer(serializers.ModelSerializer):
    """For HR creating or managing user accounts and profiles."""
    password = serializers.CharField(write_only=True, required=False)
    employee_code = serializers.CharField(required=False, write_only=True)
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        required=False,
        allow_null=True,
        write_only=True,
    )
    manager_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
        write_only=True,
    )
    designation = serializers.CharField(required=False, allow_blank=True, write_only=True)
    joining_date = serializers.DateField(required=False, allow_null=True, write_only=True)
    phone_number = serializers.CharField(required=False, allow_blank=True, write_only=True)
    profile = EmployeeProfileNestedSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'first_name',
            'last_name',
            'role',
            'is_active',
            'password',
            'employee_code',
            'department_id',
            'manager_id',
            'designation',
            'joining_date',
            'phone_number',
            'profile',
        ]

    def create(self, validated_data):
        password = validated_data.pop('password', 'TemporaryPass123!')
        emp_code = validated_data.pop('employee_code', None)
        dept = validated_data.pop('department_id', None)
        manager = validated_data.pop('manager_id', None)
        designation = validated_data.pop('designation', '')
        joining_date = validated_data.pop('joining_date', None)
        phone = validated_data.pop('phone_number', '')

        user = User.objects.create_user(password=password, **validated_data)
        if not emp_code:
            emp_code = f"EMP-{user.id:04d}"

        EmployeeProfile.objects.create(
            user=user,
            employee_code=emp_code,
            department=dept,
            manager=manager,
            designation=designation,
            joining_date=joining_date,
            phone_number=phone,
        )
        return user
