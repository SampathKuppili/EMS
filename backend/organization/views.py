from rest_framework import viewsets, permissions
from accounts.permissions import IsAdminOrHR
from .models import Department, EmployeeProfile, Holiday
from .serializers import (
    DepartmentSerializer,
    HolidaySerializer,
    EmployeeProfileSerializer,
)


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.prefetch_related('employees').all()
    serializer_class = DepartmentSerializer
    filterset_fields = ['name']
    search_fields = ['name', 'description']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsAdminOrHR()]


class HolidayViewSet(viewsets.ModelViewSet):
    queryset = Holiday.objects.all().order_by('date')
    serializer_class = HolidaySerializer
    filterset_fields = ['date']
    search_fields = ['name', 'description']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsAdminOrHR()]


class EmployeeProfileViewSet(viewsets.ModelViewSet):
    queryset = (
        EmployeeProfile.objects.select_related('user', 'department', 'manager')
        .all()
        .order_by('employee_code')
    )
    serializer_class = EmployeeProfileSerializer
    filterset_fields = ['department', 'manager']
    search_fields = ['employee_code', 'user__first_name', 'user__last_name', 'user__email']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsAdminOrHR()]
