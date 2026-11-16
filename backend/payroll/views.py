from decimal import Decimal
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from accounts.models import User
from accounts.permissions import IsAdminOrHR, IsAdminOnly
from .models import (
    SalaryStructure,
    SalaryComponent,
    TaxDeduction,
    PayslipTemplate,
    Payslip,
)
from .serializers import (
    SalaryStructureSerializer,
    SalaryComponentSerializer,
    TaxDeductionSerializer,
    PayslipTemplateSerializer,
    PayslipSerializer,
)


class SalaryStructureViewSet(viewsets.ModelViewSet):
    """
    Employee Compensation & Salary Structure.
    - Admin & HR: Full management of salaries, flexible allowances, and component structures.
    - Employees: Read-only access strictly to their own personal salary breakdown.
    """
    serializer_class = SalaryStructureSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['currency', 'pay_frequency', 'is_active', 'employee']
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__email']

    def get_queryset(self):
        user = self.request.user
        qs = SalaryStructure.objects.select_related('employee').prefetch_related('components').all()

        if user.role in [User.Role.ADMIN, User.Role.HR_MANAGER] or user.is_superuser:
            return qs

        return qs.filter(employee=user)

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsAdminOrHR()]
        return [permissions.IsAuthenticated()]


class TaxDeductionViewSet(viewsets.ModelViewSet):
    """
    Tax Deduction, Regime Selection & TDS Profiles.
    - Admin & HR: View and adjust tax deduction plans and TDS quotas for staff.
    - Employees: View own tax profile and submit annual investment declarations.
    """
    serializer_class = TaxDeductionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['tax_year', 'tax_regime', 'employee']
    search_fields = ['pan_or_tax_id', 'employee__first_name', 'employee__last_name']

    def get_queryset(self):
        user = self.request.user
        qs = TaxDeduction.objects.select_related('employee').all()

        if user.role in [User.Role.ADMIN, User.Role.HR_MANAGER] or user.is_superuser:
            return qs

        return qs.filter(employee=user)

    def get_permissions(self):
        if self.action in ['create', 'destroy']:
            return [permissions.IsAuthenticated(), IsAdminOrHR()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save()


class PayslipTemplateViewSet(viewsets.ModelViewSet):
    """
    Payslip Template Management.
    - Admins: Design, select, configure, and activate custom payslip templates.
    - HR / Staff: Read active templates for styling payslip views.
    """
    serializer_class = PayslipTemplateSerializer
    queryset = PayslipTemplate.objects.all()
    filterset_fields = ['theme_code', 'is_default']
    search_fields = ['name', 'company_name']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsAdminOnly()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class PayslipViewSet(viewsets.ModelViewSet):
    """
    Employee Payslips & Payroll Execution.
    - Admin & HR: Generate, create, update, and publish employee payslips.
    - Employees: View and download their own published payslips.
    """
    serializer_class = PayslipSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['month', 'year', 'status', 'employee', 'currency']
    search_fields = [
        'employee__first_name',
        'employee__last_name',
        'employee__email',
        'employee__profile__employee_code',
    ]

    def get_queryset(self):
        user = self.request.user
        qs = Payslip.objects.select_related(
            'employee',
            'employee__profile',
            'employee__profile__department',
            'template',
            'generated_by',
        ).all()

        if user.role in [User.Role.ADMIN, User.Role.HR_MANAGER] or user.is_superuser:
            return qs

        # Employees only view published / paid payslips for themselves
        return qs.filter(employee=user, status__in=[Payslip.Status.PUBLISHED, Payslip.Status.PAID])

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'generate_batch']:
            return [permissions.IsAuthenticated(), IsAdminOrHR()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(generated_by=self.request.user)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsAdminOrHR])
    def generate_batch(self, request):
        """
        Batch-generate monthly payslips for active employees using their active SalaryStructure.
        Payload: { "month": 11, "year": 2026, "payment_date": "2026-11-30", "template_id": 1 }
        """
        month = request.data.get('month')
        year = request.data.get('year')
        payment_date = request.data.get('payment_date') or timezone.localdate().isoformat()
        template_id = request.data.get('template_id')

        if not month or not year:
            raise ValidationError({'detail': 'Both month (1-12) and year (e.g. 2026) are required.'})

        month = int(month)
        year = int(year)

        template = None
        if template_id:
            template = PayslipTemplate.objects.filter(id=template_id).first()
        if not template:
            template = PayslipTemplate.objects.filter(is_default=True).first() or PayslipTemplate.objects.first()

        structures = SalaryStructure.objects.filter(
            is_active=True,
            employee__is_active=True,
        ).select_related('employee').prefetch_related('components')

        created_count = 0
        updated_count = 0

        for struct in structures:
            emp = struct.employee
            base = struct.base_salary
            currency = struct.currency

            earnings_items = [{'name': 'Basic Salary', 'amount': float(base)}]
            deductions_items = []

            total_earnings = base
            total_deductions = Decimal('0.00')

            for comp in struct.components.all():
                comp_amt = comp.amount
                if comp.calculation_type == SalaryComponent.CalculationType.PERCENTAGE:
                    comp_amt = (base * comp.amount) / Decimal('100.00')

                if comp.component_type == SalaryComponent.ComponentType.EARNING:
                    earnings_items.append({'name': comp.name, 'amount': float(comp_amt)})
                    total_earnings += comp_amt
                else:
                    deductions_items.append({'name': comp.name, 'amount': float(comp_amt)})
                    total_deductions += comp_amt

            # Check if active TDS deduction exists for employee
            tax_profile = TaxDeduction.objects.filter(employee=emp, tax_year=year).first()
            if tax_profile and tax_profile.tds_monthly_deduction > 0:
                tds_amt = tax_profile.tds_monthly_deduction
                deductions_items.append({'name': f'TDS / Tax ({tax_profile.get_tax_regime_display()})', 'amount': float(tds_amt)})
                total_deductions += tds_amt

            net_salary = max(Decimal('0.00'), total_earnings - total_deductions)

            payslip, created = Payslip.objects.update_or_create(
                employee=emp,
                month=month,
                year=year,
                defaults={
                    'template': template,
                    'payment_date': payment_date,
                    'currency': currency,
                    'basic_salary': base,
                    'total_earnings': total_earnings,
                    'total_deductions': total_deductions,
                    'net_salary': net_salary,
                    'earnings_breakdown': earnings_items,
                    'deductions_breakdown': deductions_items,
                    'status': Payslip.Status.PUBLISHED,
                    'working_days': 30,
                    'paid_days': Decimal('30.0'),
                    'generated_by': request.user,
                }
            )

            if created:
                created_count += 1
            else:
                updated_count += 1

        return Response({
            'message': f'Payroll processed for {month}/{year}: {created_count} created, {updated_count} updated.',
            'created_count': created_count,
            'updated_count': updated_count,
        })
