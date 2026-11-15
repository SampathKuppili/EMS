from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    TodayAttendanceView,
    CheckInView,
    CheckOutView,
    AttendanceRecordViewSet,
    AttendanceSummaryView,
    AutoClassifyAttendanceView,
)

router = DefaultRouter()
router.register(r'records', AttendanceRecordViewSet, basename='attendance-records')

urlpatterns = [
    path('today/', TodayAttendanceView.as_view(), name='attendance-today'),
    path('check-in/', CheckInView.as_view(), name='attendance-check-in'),
    path('check-out/', CheckOutView.as_view(), name='attendance-check-out'),
    path('summary/', AttendanceSummaryView.as_view(), name='attendance-summary'),
    path('auto-classify/', AutoClassifyAttendanceView.as_view(), name='attendance-auto-classify'),
    path('', include(router.urls)),
]
