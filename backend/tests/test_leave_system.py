from datetime import date, timedelta
from decimal import Decimal
from django.core.exceptions import ValidationError, PermissionDenied
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User
from approvals.models import ApprovalHistory
from approvals.services import process_leave_approval, process_leave_cancellation
from leave.models import LeaveType, LeaveBalance, LeaveRequest
from leave.services import calculate_leave_duration, validate_no_overlapping_requests
from notifications.models import Notification
from organization.models import Department, EmployeeProfile, Holiday


class LeaveSystemTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.year = 2026

        # Departments
        self.dept = Department.objects.create(name="Engineering")

        # Users
        self.admin = User.objects.create_superuser(
            email="admin@test.com", password="Password123!", role=User.Role.ADMIN, first_name="Admin"
        )
        self.manager = User.objects.create_user(
            email="manager@test.com", password="Password123!", role=User.Role.MANAGER, first_name="Manager"
        )
        self.employee1 = User.objects.create_user(
            email="emp1@test.com", password="Password123!", role=User.Role.EMPLOYEE, first_name="Employee1"
        )
        self.employee2 = User.objects.create_user(
            email="emp2@test.com", password="Password123!", role=User.Role.EMPLOYEE, first_name="Employee2"
        )

        # Profiles
        EmployeeProfile.objects.create(
            user=self.manager, employee_code="MGR-01", department=self.dept
        )
        EmployeeProfile.objects.create(
            user=self.employee1, employee_code="EMP-01", department=self.dept, manager=self.manager
        )
        # Employee2 has NO manager assigned (or different manager)
        EmployeeProfile.objects.create(
            user=self.employee2, employee_code="EMP-02", department=self.dept
        )

        # Leave Types
        self.cl = LeaveType.objects.create(
            name="Casual Leave", code="CL", annual_allowance=Decimal("12.0"), requires_approval=True
        )
        self.sl = LeaveType.objects.create(
            name="Sick Leave", code="SL", annual_allowance=Decimal("10.0"), requires_approval=True
        )

        # Balances
        self.bal1 = LeaveBalance.objects.create(
            employee=self.employee1, leave_type=self.cl, year=self.year,
            allocated_days=Decimal("12.0"), used_days=Decimal("0.0")
        )
        self.bal2 = LeaveBalance.objects.create(
            employee=self.employee2, leave_type=self.cl, year=self.year,
            allocated_days=Decimal("12.0"), used_days=Decimal("0.0")
        )

    def test_user_roles(self):
        self.assertTrue(self.admin.is_admin_or_hr)
        self.assertTrue(self.manager.is_manager)
        self.assertTrue(self.employee1.is_employee)
        self.assertFalse(self.employee1.is_manager)

    def test_duration_calculation_excludes_weekends_and_holidays(self):
        # 2026-10-16 is Friday, 2026-10-17 is Saturday, 2026-10-18 is Sunday, 2026-10-19 is Monday
        start = date(2026, 10, 16) # Friday
        end = date(2026, 10, 19)   # Monday
        # Total span 4 days, but weekend has 2 days -> 2 working days
        duration = calculate_leave_duration(start, end)
        self.assertEqual(duration, Decimal("2.0"))

        # Add a holiday on Monday (2026-10-19)
        Holiday.objects.create(date=date(2026, 10, 19), name="Test Holiday")
        duration_with_holiday = calculate_leave_duration(start, end)
        self.assertEqual(duration_with_holiday, Decimal("1.0"))

    def test_half_day_duration(self):
        day = date(2026, 10, 20) # Tuesday
        duration = calculate_leave_duration(day, day, is_half_day=True)
        self.assertEqual(duration, Decimal("0.5"))

        # Half day across different dates raises error
        with self.assertRaises(ValidationError):
            calculate_leave_duration(date(2026, 10, 20), date(2026, 10, 21), is_half_day=True)

    def test_overlapping_requests_rejected(self):
        # Create initial leave request
        LeaveRequest.objects.create(
            employee=self.employee1,
            leave_type=self.cl,
            start_date=date(2026, 11, 2),
            end_date=date(2026, 11, 4),
            duration_days=Decimal("3.0"),
            reason="Trip",
            status=LeaveRequest.Status.PENDING,
        )

        # Overlapping request on 2026-11-03 to 2026-11-05 should be rejected
        with self.assertRaises(ValidationError):
            validate_no_overlapping_requests(
                self.employee1,
                date(2026, 11, 3),
                date(2026, 11, 5)
            )

        # Non-overlapping request on 2026-11-10 should succeed
        validate_no_overlapping_requests(
            self.employee1,
            date(2026, 11, 10),
            date(2026, 11, 12)
        )

    def test_approval_workflow_and_atomic_balance_deduction(self):
        req = LeaveRequest.objects.create(
            employee=self.employee1,
            leave_type=self.cl,
            start_date=date(2026, 11, 2),
            end_date=date(2026, 11, 4),
            duration_days=Decimal("3.0"),
            reason="Family function",
            status=LeaveRequest.Status.PENDING,
        )

        # Initial balance: 12 allocated, 0 used
        self.assertEqual(self.bal1.used_days, Decimal("0.0"))

        # Manager approves
        updated_req = process_leave_approval(
            req.id, self.manager, ApprovalHistory.Action.APPROVED, comment="Approved, enjoy!"
        )
        self.assertEqual(updated_req.status, LeaveRequest.Status.APPROVED)

        # Balance updated
        self.bal1.refresh_from_db()
        self.assertEqual(self.bal1.used_days, Decimal("3.0"))
        self.assertEqual(self.bal1.remaining_days, Decimal("9.0"))

        # Approval history created
        history = ApprovalHistory.objects.filter(leave_request=req)
        self.assertEqual(history.count(), 1)
        self.assertEqual(history.first().action, ApprovalHistory.Action.APPROVED)
        self.assertEqual(history.first().approver, self.manager)

        # Notification created
        notif = Notification.objects.filter(recipient=self.employee1).first()
        self.assertIsNotNone(notif)
        self.assertIn("APPROVED", notif.title)

    def test_idempotent_approval_rejects_duplicate_action(self):
        req = LeaveRequest.objects.create(
            employee=self.employee1,
            leave_type=self.cl,
            start_date=date(2026, 11, 2),
            end_date=date(2026, 11, 4),
            duration_days=Decimal("3.0"),
            reason="Trip",
            status=LeaveRequest.Status.PENDING,
        )
        process_leave_approval(req.id, self.manager, ApprovalHistory.Action.APPROVED)

        # Second approval should fail
        with self.assertRaises(ValidationError):
            process_leave_approval(req.id, self.manager, ApprovalHistory.Action.APPROVED)

    def test_unauthorized_manager_cannot_approve(self):
        # Request for employee2 (not managed by self.manager)
        req = LeaveRequest.objects.create(
            employee=self.employee2,
            leave_type=self.cl,
            start_date=date(2026, 11, 2),
            end_date=date(2026, 11, 4),
            duration_days=Decimal("3.0"),
            reason="Doctor",
            status=LeaveRequest.Status.PENDING,
        )
        with self.assertRaises(PermissionDenied):
            process_leave_approval(req.id, self.manager, ApprovalHistory.Action.APPROVED)

    def test_cancellation_reverses_balance_if_approved(self):
        req = LeaveRequest.objects.create(
            employee=self.employee1,
            leave_type=self.cl,
            start_date=date(2026, 11, 2),
            end_date=date(2026, 11, 4),
            duration_days=Decimal("3.0"),
            reason="Vacation",
            status=LeaveRequest.Status.PENDING,
        )
        process_leave_approval(req.id, self.manager, ApprovalHistory.Action.APPROVED)
        self.bal1.refresh_from_db()
        self.assertEqual(self.bal1.used_days, Decimal("3.0"))

        # Employee cancels the approved leave
        cancelled_req = process_leave_cancellation(req.id, self.employee1, reason="Plans changed")
        self.assertEqual(cancelled_req.status, LeaveRequest.Status.CANCELLED)

        # Balance reversed
        self.bal1.refresh_from_db()
        self.assertEqual(self.bal1.used_days, Decimal("0.0"))
        self.assertEqual(self.bal1.remaining_days, Decimal("12.0"))

    def test_api_employee_isolation(self):
        # Create request for Employee 1
        req1 = LeaveRequest.objects.create(
            employee=self.employee1,
            leave_type=self.cl,
            start_date=date(2026, 11, 2),
            end_date=date(2026, 11, 4),
            duration_days=Decimal("3.0"),
            reason="Personal",
        )
        # Login as Employee 2
        self.client.force_authenticate(user=self.employee2)
        response = self.client.get('/api/v1/leave/requests/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Employee 2 should NOT see Employee 1's request
        self.assertEqual(len(response.data['results']), 0)

        # Employee 2 cannot access Employee 1's request directly
        detail_resp = self.client.get(f'/api/v1/leave/requests/{req1.id}/')
        self.assertEqual(detail_resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_api_manager_can_see_direct_reports(self):
        req1 = LeaveRequest.objects.create(
            employee=self.employee1,
            leave_type=self.cl,
            start_date=date(2026, 11, 2),
            end_date=date(2026, 11, 4),
            duration_days=Decimal("3.0"),
            reason="Personal",
        )
        # Login as Manager
        self.client.force_authenticate(user=self.manager)
        response = self.client.get('/api/v1/leave/requests/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], req1.id)

    def test_all_four_roles_properties(self):
        hr_user = User.objects.create_user(
            email="hr_test@test.com", password="Password123!", role=User.Role.HR_MANAGER
        )
        intern_user = User.objects.create_user(
            email="intern_test@test.com", password="Password123!", role=User.Role.INTERN
        )
        self.assertTrue(self.admin.is_admin)
        self.assertTrue(hr_user.is_hr)
        self.assertTrue(hr_user.is_admin_or_hr)
        self.assertTrue(self.employee1.is_employee)
        self.assertTrue(intern_user.is_intern)
        self.assertFalse(intern_user.is_admin_or_hr)

    def test_carry_forward_leave_balance(self):
        # Create a balance with allocated 15 days, 4 carry-forward days, 2 used days
        bal = LeaveBalance.objects.create(
            employee=self.employee1,
            leave_type=self.sl,
            year=self.year,
            allocated_days=Decimal("15.0"),
            carried_forward_days=Decimal("4.0"),
            used_days=Decimal("2.0"),
        )
        self.assertEqual(bal.total_allocated_days, Decimal("19.0"))
        self.assertEqual(bal.remaining_days, Decimal("17.0"))

    def test_department_crud_permissions(self):
        # Admin creates department
        self.client.force_authenticate(user=self.admin)
        create_resp = self.client.post('/api/v1/departments/', {
            'name': 'DevOps & SRE',
            'description': 'Infrastructure and automation.'
        })
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        dept_id = create_resp.data['id']

        # Admin updates department
        patch_resp = self.client.patch(f'/api/v1/departments/{dept_id}/', {
            'description': 'Updated infrastructure and cloud.'
        })
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_resp.data['description'], 'Updated infrastructure and cloud.')

        # Employee cannot delete department
        self.client.force_authenticate(user=self.employee1)
        del_emp_resp = self.client.delete(f'/api/v1/departments/{dept_id}/')
        self.assertEqual(del_emp_resp.status_code, status.HTTP_403_FORBIDDEN)

        # Admin deletes department
        self.client.force_authenticate(user=self.admin)
        del_resp = self.client.delete(f'/api/v1/departments/{dept_id}/')
        self.assertEqual(del_resp.status_code, status.HTTP_204_NO_CONTENT)

    def test_holiday_calendar_crud_permissions(self):
        # Admin creates holiday
        self.client.force_authenticate(user=self.admin)
        h_resp = self.client.post('/api/v1/holidays/', {
            'date': '2026-11-26',
            'name': 'Thanksgiving Day',
            'description': 'Corporate holiday'
        })
        self.assertEqual(h_resp.status_code, status.HTTP_201_CREATED)
        hol_id = h_resp.data['id']

        # Admin updates holiday
        edit_resp = self.client.patch(f'/api/v1/holidays/{hol_id}/', {
            'name': 'Thanksgiving Holiday (Observed)'
        })
        self.assertEqual(edit_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(edit_resp.data['name'], 'Thanksgiving Holiday (Observed)')

        # Employee cannot delete holiday
        self.client.force_authenticate(user=self.employee1)
        emp_del = self.client.delete(f'/api/v1/holidays/{hol_id}/')
        self.assertEqual(emp_del.status_code, status.HTTP_403_FORBIDDEN)

        # Admin deletes holiday
        self.client.force_authenticate(user=self.admin)
        admin_del = self.client.delete(f'/api/v1/holidays/{hol_id}/')
        self.assertEqual(admin_del.status_code, status.HTTP_204_NO_CONTENT)

    def test_hr_dashboard_analytics_endpoint(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/reports/hr-dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('department_distribution', response.data)
        self.assertIn('attendance_trends', response.data)
        self.assertIn('performance', response.data)
        self.assertIn('kpis', response.data)
        self.assertIn('today', response.data)
        self.assertEqual(len(response.data['attendance_trends']), 12)

