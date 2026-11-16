from rest_framework import viewsets, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from django.db.models import Q

from accounts.models import User
from .models import EmployeeDocument
from .serializers import EmployeeDocumentSerializer


class EmployeeDocumentViewSet(viewsets.ModelViewSet):
    """
    CRUD API for Employee Documents.
    - Admin: Full visibility across all staff documents.
    - HR: Can view, upload, and manage documents for employees/interns/managers.
    - Employee: Can strictly view and upload their own personal documents.
    """
    serializer_class = EmployeeDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['category', 'employee']
    search_fields = ['title', 'notes', 'employee__first_name', 'employee__last_name', 'employee__email']

    def get_queryset(self):
        user = self.request.user
        qs = EmployeeDocument.objects.select_related('employee', 'uploaded_by').all()

        if user.role == User.Role.ADMIN or user.is_superuser:
            return qs

        if user.role == User.Role.HR_MANAGER or user.is_staff:
            # HR can view documents for all non-admin employees (or all staff)
            return qs.filter(~Q(employee__role=User.Role.ADMIN))

        # Regular employees & managers view strictly their own documents
        return qs.filter(employee=user)

    def perform_create(self, serializer):
        user = self.request.user
        target_employee = serializer.validated_data.get('employee')

        # If not Admin or HR, users can ONLY submit documents for themselves
        if user.role not in [User.Role.ADMIN, User.Role.HR_MANAGER] and not user.is_superuser:
            if target_employee and target_employee.id != user.id:
                raise PermissionDenied("You do not have permission to submit documents for other employees.")
            serializer.save(employee=user, uploaded_by=user)
        else:
            serializer.save(uploaded_by=user)

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == User.Role.ADMIN or user.is_superuser:
            instance.delete()
        elif user.role == User.Role.HR_MANAGER and instance.employee.role != User.Role.ADMIN:
            instance.delete()
        elif instance.uploaded_by_id == user.id and instance.employee_id == user.id:
            instance.delete()
        else:
            raise PermissionDenied("You do not have permission to delete this document.")
