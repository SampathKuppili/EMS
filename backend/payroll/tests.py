from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User
from payroll.models import (
    SalaryStructure,
    SalaryComponent,
    TaxDeduction,
    PayslipTemplate,
    Payslip,
)


class PayrollModuleTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email='admin@ems.local',
            password='TestPassword123!',
            first_name='Admin',
            last_name='User',
            role=User.Role.ADMIN,
        )
        self.employee = User.objects.create_user(
            email='emp@ems.local',
            password='TestPassword123!',
            first_name='David',
            last_name='Miller',
            role=User.Role.EMPLOYEE,
        )

        self.template = PayslipTemplate.objects.create(
            name='Modern Clean Standard',
            theme_code=PayslipTemplate.Theme.MODERN_CLEAN,
            company_name='Acme Corp',
            company_address='Tech Park',
            is_default=True,
        )

        self.salary = SalaryStructure.objects.create(
            employee=self.employee,
            currency='INR',
            base_salary=Decimal('50000.00'),
            effective_date=timezone.localdate(),
        )

        SalaryComponent.objects.create(
            salary_structure=self.salary,
            name='House Rent Allowance',
            component_type=SalaryComponent.ComponentType.EARNING,
            calculation_type=SalaryComponent.CalculationType.PERCENTAGE,
            amount=Decimal('40.00'),
        )

        SalaryComponent.objects.create(
            salary_structure=self.salary,
            name='Provident Fund',
            component_type=SalaryComponent.ComponentType.DEDUCTION,
            calculation_type=SalaryComponent.CalculationType.PERCENTAGE,
            amount=Decimal('12.00'),
        )

    def test_employee_can_only_read_own_salary(self):
        self.client.force_authenticate(user=self.employee)
        response = self.client.get('/api/v1/payroll/salaries/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)

        # Employee cannot create salary structure
        post_response = self.client.post('/api/v1/payroll/salaries/', {
            'employee': self.employee.id,
            'base_salary': '60000.00',
        })
        self.assertEqual(post_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_batch_payroll_generation(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/v1/payroll/payslips/generate_batch/', {
            'month': 11,
            'year': 2026,
            'payment_date': '2026-11-30',
            'template_id': self.template.id,
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(Payslip.objects.filter(employee=self.employee, month=11, year=2026).exists())
        slip = Payslip.objects.get(employee=self.employee, month=11, year=2026)
        # Gross = 50,000 + 40% (20,000) = 70,000
        # Deductions = 12% of 50,000 = 6,000
        # Net = 64,000
        self.assertEqual(slip.total_earnings, Decimal('70000.00'))
        self.assertEqual(slip.total_deductions, Decimal('6000.00'))
        self.assertEqual(slip.net_salary, Decimal('64000.00'))

    def test_template_access_controls(self):
        # Employees cannot alter templates
        self.client.force_authenticate(user=self.employee)
        response = self.client.post('/api/v1/payroll/templates/', {
            'name': 'Hacked Template',
            'theme_code': 'MODERN_CLEAN',
            'company_name': 'Hacked Inc',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Admin can create template
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/v1/payroll/templates/', {
            'name': 'Corporate Pro 2026',
            'theme_code': 'CORPORATE_CLASSIC',
            'company_name': 'Acme Corp',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
