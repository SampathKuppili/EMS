from rest_framework import permissions
from accounts.models import User


class IsAdminOnly(permissions.BasePermission):
    """
    Allows access strictly to Admin users or superusers.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.role == User.Role.ADMIN or request.user.is_superuser)
        )


class IsAdminOrHR(permissions.BasePermission):
    """
    Allows access to Admin or HR Manager users or superusers.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.role in [User.Role.ADMIN, User.Role.HR_MANAGER] or request.user.is_staff or request.user.is_superuser)
        )


class IsManagerOrAdmin(permissions.BasePermission):
    """
    Allows access to Managers, HR Managers, or Admins.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.role in [User.Role.ADMIN, User.Role.HR_MANAGER, User.Role.MANAGER] or request.user.is_superuser)
        )


class IsOwnerOrManagerOrAdmin(permissions.BasePermission):
    """
    Object-level permission allowing:
    - Object owner (employee)
    - The employee's reporting manager
    - HR / Admins
    """
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if user.is_admin_or_hr:
            return True

        # Check if obj is employee user
        if hasattr(obj, 'employee'):
            target_employee = obj.employee
        elif isinstance(obj, User):
            target_employee = obj
        else:
            return False

        if target_employee == user:
            return True

        # Check manager relationship
        if hasattr(target_employee, 'profile') and target_employee.profile.manager == user:
            return True

        return False
