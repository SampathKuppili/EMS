from decimal import Decimal
from rest_framework import serializers
from accounts.serializers import BasicUserSerializer
from .models import (
    SalaryStructure,
    SalaryComponent,
    TaxDeduction,
    PayslipTemplate,
    Payslip,
)


class SalaryComponentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalaryComponent
        fields = [
            'id',
            'salary_structure',
            'name',
            'component_type',
            'calculation_type',
            'amount',
            'is_taxable',
            'order',
        ]
        read_only_fields = ['id']


class SalaryStructureSerializer(serializers.ModelSerializer):
    employee_details = BasicUserSerializer(source='employee', read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    components = SalaryComponentSerializer(many=True, required=False)

    class Meta:
        model = SalaryStructure
        fields = [
            'id',
            'employee',
            'employee_name',
            'employee_details',
            'currency',
            'base_salary',
            'pay_frequency',
            'effective_date',
            'is_active',
            'components',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        components_data = validated_data.pop('components', [])
        structure = SalaryStructure.objects.create(**validated_data)
        for comp in components_data:
            SalaryComponent.objects.create(salary_structure=structure, **comp)
        return structure

    def update(self, instance, validated_data):
        components_data = validated_data.pop('components', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if components_data is not None:
            instance.components.all().delete()
            for comp in components_data:
                SalaryComponent.objects.create(salary_structure=instance, **comp)

        return instance


class TaxDeductionSerializer(serializers.ModelSerializer):
    employee_details = BasicUserSerializer(source='employee', read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    tax_regime_display = serializers.CharField(source='get_tax_regime_display', read_only=True)

    class Meta:
        model = TaxDeduction
        fields = [
            'id',
            'employee',
            'employee_name',
            'employee_details',
            'tax_year',
            'pan_or_tax_id',
            'tax_regime',
            'tax_regime_display',
            'tds_monthly_deduction',
            'declared_investments',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PayslipTemplateSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    theme_display = serializers.CharField(source='get_theme_code_display', read_only=True)

    class Meta:
        model = PayslipTemplate
        fields = [
            'id',
            'name',
            'theme_code',
            'theme_display',
            'company_name',
            'company_address',
            'company_logo_url',
            'footer_notes',
            'accent_color',
            'is_default',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class PayslipSerializer(serializers.ModelSerializer):
    employee_details = BasicUserSerializer(source='employee', read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.profile.employee_code', read_only=True)
    department_name = serializers.CharField(source='employee.profile.department.name', read_only=True)
    designation = serializers.CharField(source='employee.profile.designation', read_only=True)
    template_details = PayslipTemplateSerializer(source='template', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Payslip
        fields = [
            'id',
            'employee',
            'employee_name',
            'employee_code',
            'department_name',
            'designation',
            'employee_details',
            'template',
            'template_details',
            'month',
            'year',
            'payment_date',
            'currency',
            'basic_salary',
            'total_earnings',
            'total_deductions',
            'net_salary',
            'earnings_breakdown',
            'deductions_breakdown',
            'status',
            'status_display',
            'working_days',
            'paid_days',
            'notes',
            'generated_by',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'generated_by', 'created_at', 'updated_at']
