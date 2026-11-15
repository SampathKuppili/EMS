from datetime import date, timedelta
from decimal import Decimal
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from attendance.models import AttendanceRecord
from attendance.services import auto_classify_absences_for_date
from leave.models import LeaveType, LeaveRequest
from organization.models import Department, EmployeeProfile, Holiday


class AttendanceTrackingTests(APITestCase):
    def setUp(self):
        # Create department
        self.dept = Department.objects.create(name="Engineering", description="Tech team")

        # Create Admin
        self.admin_user = User.objects.create_user(
            email="admin@example.com",
            password="Password123!",
            role=User.Role.ADMIN,
            first_name="Admin",
            last_name="User",
        )

        # Create Manager
        self.manager_user = User.objects.create_user(
            email="manager@example.com",
            password="Password123!",
            role=User.Role.MANAGER,
            first_name="Manager",
            last_name="Boss",
        )

        # Create Employee 1 (reports to manager)
        self.emp1 = User.objects.create_user(
            email="employee1@example.com",
            password="Password123!",
            role=User.Role.EMPLOYEE,
            first_name="Alice",
            last_name="Smith",
        )
        self.profile1 = EmployeeProfile.objects.create(
            user=self.emp1,
            employee_code="EMP-101",
            department=self.dept,
            manager=self.manager_user,
        )

        # Create Employee 2
        self.emp2 = User.objects.create_user(
            email="employee2@example.com",
            password="Password123!",
            role=User.Role.EMPLOYEE,
            first_name="Bob",
            last_name="Jones",
        )
        self.profile2 = EmployeeProfile.objects.create(
            user=self.emp2,
            employee_code="EMP-102",
            department=self.dept,
        )

        # Create Paid Leave Type
        self.annual_leave = LeaveType.objects.create(
            name="Annual Leave",
            code="AL",
            is_paid=True,
            requires_approval=True,
        )

    def test_check_in_success(self):
        self.client.force_authenticate(user=self.emp1)
        response = self.client.post('/api/v1/attendance/check-in/', {'notes': 'Starting work today'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        today = timezone.localdate()
        record = AttendanceRecord.objects.filter(employee=self.emp1, date=today).first()
        self.assertIsNotNone(record)
        self.assertEqual(record.status, AttendanceRecord.Status.PRESENT)
        self.assertIsNotNone(record.check_in)
        self.assertIsNone(record.check_out)
        self.assertTrue(record.is_checked_in)

    def test_duplicate_check_in_rejected(self):
        self.client.force_authenticate(user=self.emp1)
        res1 = self.client.post('/api/v1/attendance/check-in/', {})
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        # Second attempt should fail with validation error
        res2 = self.client.post('/api/v1/attendance/check-in/', {})
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already checked in", str(res2.data))

    def test_check_out_calculates_work_duration_and_status(self):
        self.client.force_authenticate(user=self.emp1)
        today = timezone.localdate()

        # Create checked-in record from 8 hours ago
        start_time = timezone.now() - timedelta(hours=8)
        AttendanceRecord.objects.create(
            employee=self.emp1,
            date=today,
            check_in=start_time,
            status=AttendanceRecord.Status.PRESENT,
        )

        response = self.client.post('/api/v1/attendance/check-out/', {'notes': 'Finished daily tasks'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        record = AttendanceRecord.objects.get(employee=self.emp1, date=today)
        self.assertIsNotNone(record.check_out)
        self.assertGreaterEqual(record.work_duration_hours, Decimal('7.9'))
        self.assertEqual(record.status, AttendanceRecord.Status.PRESENT)
        self.assertTrue(record.is_completed)

    def test_check_out_without_check_in_fails(self):
        self.client.force_authenticate(user=self.emp2)
        response = self.client.post('/api/v1/attendance/check-out/', {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Cannot check out without checking in", str(response.data))

    def test_check_in_blocked_when_on_full_day_approved_leave(self):
        today = timezone.localdate()
        LeaveRequest.objects.create(
            employee=self.emp1,
            leave_type=self.annual_leave,
            start_date=today,
            end_date=today,
            status=LeaveRequest.Status.APPROVED,
            is_half_day=False,
            duration_days=Decimal('1.0'),
            reason="Family vacation",
        )

        self.client.force_authenticate(user=self.emp1)
        response = self.client.post('/api/v1/attendance/check-in/', {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("approved Annual Leave", str(response.data))

    def test_today_status_endpoint(self):
        self.client.force_authenticate(user=self.emp1)
        response = self.client.get('/api/v1/attendance/today/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['can_check_in'])
        self.assertFalse(response.data['can_check_out'])
        self.assertIsNone(response.data['record'])

    def test_auto_classify_absences(self):
        # Target date is a Wednesday in the past
        past_date = date(2026, 10, 14)

        # 1. Emp1 had an approved leave on that date
        LeaveRequest.objects.create(
            employee=self.emp1,
            leave_type=self.annual_leave,
            start_date=past_date,
            end_date=past_date,
            status=LeaveRequest.Status.APPROVED,
            duration_days=Decimal('1.0'),
            reason="Approved vacation",
        )

        # 2. Emp2 had no record and no leave
        count = auto_classify_absences_for_date(past_date)
        self.assertGreaterEqual(count, 2)

        record_emp1 = AttendanceRecord.objects.get(employee=self.emp1, date=past_date)
        self.assertEqual(record_emp1.status, AttendanceRecord.Status.ON_LEAVE)

        record_emp2 = AttendanceRecord.objects.get(employee=self.emp2, date=past_date)
        self.assertEqual(record_emp2.status, AttendanceRecord.Status.ABSENT)

    def test_role_based_record_visibility(self):
        today = timezone.localdate()
        AttendanceRecord.objects.create(
            employee=self.emp1,
            date=today,
            status=AttendanceRecord.Status.PRESENT,
        )
        AttendanceRecord.objects.create(
            employee=self.emp2,
            date=today,
            status=AttendanceRecord.Status.PRESENT,
        )

        # Employee 1 should only see their own record
        self.client.force_authenticate(user=self.emp1)
        resp1 = self.client.get('/api/v1/attendance/records/')
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        # Handle paginated or non-paginated list
        results1 = resp1.data.get('results', resp1.data)
        self.assertEqual(len(results1), 1)
        self.assertEqual(results1[0]['employee'], self.emp1.id)

        # Manager can see Employee 1 (direct report) but not Employee 2 (not direct report)
        self.client.force_authenticate(user=self.manager_user)
        resp_mgr = self.client.get('/api/v1/attendance/records/')
        results_mgr = resp_mgr.data.get('results', resp_mgr.data)
        emp_ids = [r['employee'] for r in results_mgr]
        self.assertIn(self.emp1.id, emp_ids)
        self.assertNotIn(self.emp2.id, emp_ids)

        # Admin can see all records
        self.client.force_authenticate(user=self.admin_user)
        resp_admin = self.client.get('/api/v1/attendance/records/')
        results_admin = resp_admin.data.get('results', resp_admin.data)
        self.assertEqual(len(results_admin), 2)
