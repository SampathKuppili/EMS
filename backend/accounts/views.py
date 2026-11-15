from rest_framework import generics, viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from accounts.models import User
from accounts.permissions import IsAdminOrHR
from accounts.serializers import (
    CustomTokenObtainPairSerializer,
    UserDetailSerializer,
    EmployeeSelfUpdateSerializer,
    HRUserCreateUpdateSerializer,
)


class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom JWT login endpoint returning tokens and role metadata."""
    serializer_class = CustomTokenObtainPairSerializer


class CurrentUserView(generics.RetrieveUpdateAPIView):
    """
    GET /api/v1/employees/me/ (and /api/v1/auth/me/)
    Returns the authenticated user's details and permitted profile fields.
    PATCH updates personal contact details.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return (
            User.objects.select_related('profile', 'profile__department', 'profile__manager')
            .get(pk=self.request.user.pk)
        )

    def get_serializer_class(self):
        if self.request.method in ['PATCH', 'PUT']:
            return EmployeeSelfUpdateSerializer
        return UserDetailSerializer


class UserManagementViewSet(viewsets.ModelViewSet):
    """
    CRUD endpoint for Admin/HR to manage employees.
    Filterable by role, department, and active status.
    """
    queryset = (
        User.objects.select_related('profile', 'profile__department', 'profile__manager')
        .all()
        .order_by('-date_joined')
    )
    permission_classes = [IsAdminOrHR]
    filterset_fields = ['role', 'is_active', 'profile__department']
    search_fields = ['email', 'first_name', 'last_name', 'profile__employee_code']
    ordering_fields = ['date_joined', 'email', 'role']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return HRUserCreateUpdateSerializer
        return UserDetailSerializer


class ChangePasswordView(APIView):
    """
    POST /api/v1/auth/change-password/
    Allows authenticated users to change their password securely.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')

        if not current_password or not new_password or not confirm_password:
            return Response(
                {"detail": "Please provide current_password, new_password, and confirm_password."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not user.check_password(current_password):
            return Response(
                {"detail": "Current password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(new_password) < 8:
            return Response(
                {"detail": "New password must be at least 8 characters long."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if new_password != confirm_password:
            return Response(
                {"detail": "New password and confirmation do not match."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save()
        return Response({"message": "Password changed successfully."})

