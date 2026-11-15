from datetime import date
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import User
from organization.models import Department, EmployeeProfile, Holiday
from leave.models import LeaveType, LeaveBalance


class Command(BaseCommand):
    help = 'Seeds database with realistic departments, demo users for 4 roles, leave types, holidays, and balances.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Seeding EMS database for software office environment..."))

        current_year = timezone.now().year

        # 1. Software Office Departments
        eng, _ = Department.objects.get_or_create(
            name='Engineering',
            defaults={'description': 'Core backend services, distributed systems, and web architecture.'}
        )
        hr_dept, _ = Department.objects.get_or_create(
            name='Human Resources',
            defaults={'description': 'People operations, recruitment, employee onboarding, and culture.'}
        )
        product_dept, _ = Department.objects.get_or_create(
            name='Product & Design',
            defaults={'description': 'Product strategy, roadmap delivery, UI/UX design, and user research.'}
        )
        qa_dept, _ = Department.objects.get_or_create(
            name='Quality Assurance',
            defaults={'description': 'Automated regression test suites, security testing, and release quality.'}
        )
        devops_dept, _ = Department.objects.get_or_create(
            name='DevOps & Cloud',
            defaults={'description': 'Kubernetes clusters, CI/CD pipelines, AWS/GCP cloud infrastructure.'}
        )

        # 2. Leave Types
        casual, _ = LeaveType.objects.get_or_create(
            code='CL',
            defaults={
                'name': 'Casual Leave',
                'description': 'Short-notice leave for personal urgent matters.',
                'annual_allowance': Decimal('12.0'),
                'requires_approval': True,
                'is_paid': True,
                'is_active': True,
            }
        )
        sick, _ = LeaveType.objects.get_or_create(
            code='SL',
            defaults={
                'name': 'Sick Leave',
                'description': 'Medical recovery, doctor consultations, and health wellness.',
                'annual_allowance': Decimal('10.0'),
                'requires_approval': True,
                'is_paid': True,
                'is_active': True,
            }
        )
        pto, _ = LeaveType.objects.get_or_create(
            code='PTO',
            defaults={
                'name': 'Paid Vacation / Annual Leave',
                'description': 'Planned vacation holidays and rest time. Eligible for carry-forward.',
                'annual_allowance': Decimal('15.0'),
                'requires_approval': True,
                'is_paid': True,
                'is_active': True,
            }
        )

        # 3. Software Company Holidays
        Holiday.objects.get_or_create(
            date=date(current_year, 1, 1),
            defaults={'name': "New Year's Day", 'description': 'Corporate global holiday.'}
        )
        Holiday.objects.get_or_create(
            date=date(current_year, 1, 26),
            defaults={'name': 'Republic Day', 'description': 'National public holiday.'}
        )
        Holiday.objects.get_or_create(
            date=date(current_year, 5, 1),
            defaults={'name': 'International Workers Day', 'description': 'Labor & tech workforce observance.'}
        )
        Holiday.objects.get_or_create(
            date=date(current_year, 8, 15),
            defaults={'name': 'Independence Day', 'description': 'National public holiday.'}
        )
        Holiday.objects.get_or_create(
            date=date(current_year, 10, 2),
            defaults={'name': 'Gandhi Jayanti', 'description': 'National holiday.'}
        )
        Holiday.objects.get_or_create(
            date=date(current_year, 12, 25),
            defaults={'name': 'Christmas Day', 'description': 'Winter festive holiday.'}
        )

        # 4. Users & Profiles for 4 Core Roles

        # Persona 1: Admin (System & Department Control, Holiday Calendar CRUD)
        admin_user, created = User.objects.get_or_create(
            email='admin@ems.local',
            defaults={
                'first_name': 'Sarah',
                'last_name': 'Jenkins',
                'role': User.Role.ADMIN,
                'is_staff': True,
                'is_superuser': True,
            }
        )
        if created or not admin_user.check_password('AdminPass123!'):
            admin_user.set_password('AdminPass123!')
            admin_user.role = User.Role.ADMIN
            admin_user.save()

        EmployeeProfile.objects.update_or_create(
            user=admin_user,
            defaults={
                'employee_code': 'ADM-001',
                'department': devops_dept,
                'designation': 'Principal Systems Administrator',
                'joining_date': date(2022, 1, 10),
                'phone_number': '+1 555-0100',
            }
        )

        # Persona 2: HR Manager (Onboarding, Department Assignments, Balance & Carry-Forward Allocation)
        hr_user, created = User.objects.get_or_create(
            email='hr@ems.local',
            defaults={
                'first_name': 'Elena',
                'last_name': 'Vance',
                'role': User.Role.HR_MANAGER,
                'is_staff': True,
            }
        )
        if created or not hr_user.check_password('HrPass123!'):
            hr_user.set_password('HrPass123!')
            hr_user.role = User.Role.HR_MANAGER
            hr_user.save()

        EmployeeProfile.objects.update_or_create(
            user=hr_user,
            defaults={
                'employee_code': 'HR-001',
                'department': hr_dept,
                'designation': 'HR Operations Director',
                'joining_date': date(2023, 1, 15),
                'phone_number': '+1 555-0101',
            }
        )

        # Persona 3: Manager (Team Leader, Approvals)
        manager_user, created = User.objects.get_or_create(
            email='manager@ems.local',
            defaults={
                'first_name': 'David',
                'last_name': 'Miller',
                'role': User.Role.MANAGER,
                'is_staff': False,
            }
        )
        if created or not manager_user.check_password('ManagerPass123!'):
            manager_user.set_password('ManagerPass123!')
            manager_user.save()

        EmployeeProfile.objects.update_or_create(
            user=manager_user,
            defaults={
                'employee_code': 'ENG-M01',
                'department': eng,
                'designation': 'Engineering Lead & Manager',
                'joining_date': date(2023, 3, 1),
                'phone_number': '+1 555-0102',
            }
        )

        # Persona 4: Employee (Full-time Software Engineer)
        emp1, created = User.objects.get_or_create(
            email='employee@ems.local',
            defaults={
                'first_name': 'Alex',
                'last_name': 'Morgan',
                'role': User.Role.EMPLOYEE,
                'is_staff': False,
            }
        )
        if created or not emp1.check_password('EmployeePass123!'):
            emp1.set_password('EmployeePass123!')
            emp1.save()

        EmployeeProfile.objects.update_or_create(
            user=emp1,
            defaults={
                'employee_code': 'ENG-001',
                'department': eng,
                'manager': manager_user,
                'designation': 'Senior Full-Stack Engineer',
                'joining_date': date(2024, 2, 1),
                'phone_number': '+1 555-0103',
            }
        )

        # Persona 5: Intern (Software Engineering Intern)
        intern_user, created = User.objects.get_or_create(
            email='intern@ems.local',
            defaults={
                'first_name': 'Leo',
                'last_name': 'Chen',
                'role': User.Role.INTERN,
                'is_staff': False,
            }
        )
        if created or not intern_user.check_password('InternPass123!'):
            intern_user.set_password('InternPass123!')
            intern_user.role = User.Role.INTERN
            intern_user.save()

        EmployeeProfile.objects.update_or_create(
            user=intern_user,
            defaults={
                'employee_code': 'INT-001',
                'department': eng,
                'manager': manager_user,
                'designation': 'Software Engineering Intern',
                'joining_date': date(2026, 1, 15),
                'phone_number': '+1 555-0105',
            }
        )

        # 5. Seed Balances with Carry-Forward Demonstrations
        all_leave_types = [casual, sick, pto]
        for u in [admin_user, hr_user, manager_user]:
            for lt in all_leave_types:
                LeaveBalance.objects.update_or_create(
                    employee=u,
                    leave_type=lt,
                    year=current_year,
                    defaults={
                        'allocated_days': lt.annual_allowance,
                        'carried_forward_days': Decimal('2.0') if lt.code == 'PTO' else Decimal('0.0'),
                        'used_days': Decimal('0.0'),
                    }
                )

        # Employee 1: has 3.5 carried-forward PTO days and 1.0 CL day
        LeaveBalance.objects.update_or_create(
            employee=emp1,
            leave_type=pto,
            year=current_year,
            defaults={
                'allocated_days': Decimal('15.0'),
                'carried_forward_days': Decimal('4.0'), # 4 days carried forward! Total = 19.0 days
                'used_days': Decimal('2.0'),            # 2 days used -> Remaining = 17.0 days
            }
        )
        LeaveBalance.objects.update_or_create(
            employee=emp1,
            leave_type=casual,
            year=current_year,
            defaults={
                'allocated_days': Decimal('12.0'),
                'carried_forward_days': Decimal('1.0'),
                'used_days': Decimal('1.0'),
            }
        )
        LeaveBalance.objects.update_or_create(
            employee=emp1,
            leave_type=sick,
            year=current_year,
            defaults={
                'allocated_days': Decimal('10.0'),
                'carried_forward_days': Decimal('0.0'),
                'used_days': Decimal('1.0'),
            }
        )

        # Intern: tailored intern allowance (6 CL, 5 SL, 0 carried forward)
        LeaveBalance.objects.update_or_create(
            employee=intern_user,
            leave_type=casual,
            year=current_year,
            defaults={
                'allocated_days': Decimal('6.0'),
                'carried_forward_days': Decimal('0.0'),
                'used_days': Decimal('0.0'),
            }
        )
        LeaveBalance.objects.update_or_create(
            employee=intern_user,
            leave_type=sick,
            year=current_year,
            defaults={
                'allocated_days': Decimal('5.0'),
                'carried_forward_days': Decimal('0.0'),
                'used_days': Decimal('0.0'),
            }
        )

        self.stdout.write(self.style.SUCCESS("Database successfully seeded for 4 distinct user logins!"))
        self.stdout.write(self.style.SUCCESS("1. Admin:      admin@ems.local    / AdminPass123!"))
        self.stdout.write(self.style.SUCCESS("2. HR Manager: hr@ems.local       / HrPass123!"))
        self.stdout.write(self.style.SUCCESS("3. Employee:   employee@ems.local / EmployeePass123!"))
        self.stdout.write(self.style.SUCCESS("4. Intern:     intern@ems.local   / InternPass123!"))
