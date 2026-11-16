from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User
from reimbursements.models import ReimbursementClaim


class ReimbursementModuleTests(TestCase):
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
            first_name='Mark',
            last_name='Spencer',
            role=User.Role.EMPLOYEE,
        )

        self.claim = ReimbursementClaim.objects.create(
            employee=self.employee,
            title='Client Dinner Meeting',
            category=ReimbursementClaim.Category.MEALS,
            amount=Decimal('1250.00'),
            currency='INR',
            expense_date=timezone.localdate(),
            merchant='Taj Restaurant',
        )

    def test_employee_can_submit_claim(self):
        self.client.force_authenticate(user=self.employee)
        response = self.client.post('/api/v1/reimbursements/claims/', {
            'title': 'Uber to Airport',
            'category': 'TRAVEL',
            'amount': '450.00',
            'currency': 'INR',
            'expense_date': str(timezone.localdate()),
            'merchant_name': 'Uber',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(ReimbursementClaim.objects.filter(title='Uber to Airport').exists())

    def test_admin_can_approve_claim(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f'/api/v1/reimbursements/claims/{self.claim.id}/review/', {
            'action': 'APPROVE',
            'comments': 'Verified and approved for payout.',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.claim.refresh_from_db()
        self.assertEqual(self.claim.status, ReimbursementClaim.Status.APPROVED)
        self.assertEqual(self.claim.reviewed_by, self.admin)

    def test_employee_cannot_approve_own_claim(self):
        self.client.force_authenticate(user=self.employee)
        response = self.client.post(f'/api/v1/reimbursements/claims/{self.claim.id}/review/', {
            'action': 'APPROVE',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
