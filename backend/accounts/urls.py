from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from accounts.views import (
    CustomTokenObtainPairView,
    CurrentUserView,
    UserManagementViewSet,
    ChangePasswordView,
)

router = DefaultRouter()
router.register(r'users', UserManagementViewSet, basename='user')

urlpatterns = [
    # Auth endpoints
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', CurrentUserView.as_view(), name='auth_me'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='change_password'),

    # Employee profile endpoint as required by prompt
    path('employees/me/', CurrentUserView.as_view(), name='employee_me'),

    # HR User Management
    path('', include(router.urls)),
]
