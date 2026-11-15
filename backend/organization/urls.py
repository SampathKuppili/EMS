from django.urls import path, include
from rest_framework.routers import DefaultRouter
from organization.views import (
    DepartmentViewSet,
    HolidayViewSet,
    EmployeeProfileViewSet,
)

router = DefaultRouter()
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'holidays', HolidayViewSet, basename='holiday')
router.register(r'employee-profiles', EmployeeProfileViewSet, basename='employee-profile')

urlpatterns = [
    path('', include(router.urls)),
]
