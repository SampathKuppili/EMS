from django.urls import path, include
from rest_framework.routers import DefaultRouter
from leave.views import (
    LeaveTypeViewSet,
    LeaveBalanceViewSet,
    LeaveRequestViewSet,
    LeaveCalendarView,
)

router = DefaultRouter()
router.register(r'types', LeaveTypeViewSet, basename='leave-type')
router.register(r'balance', LeaveBalanceViewSet, basename='leave-balance')
router.register(r'requests', LeaveRequestViewSet, basename='leave-request')

urlpatterns = [
    path('calendar/', LeaveCalendarView.as_view(), name='leave-calendar'),
    path('', include(router.urls)),
]
