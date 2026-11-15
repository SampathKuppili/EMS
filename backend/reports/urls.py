from django.urls import path, include
from rest_framework.routers import DefaultRouter
from reports.views import AuditLogViewSet, LeaveSummaryReportView, HRDashboardAnalyticsView

router = DefaultRouter()
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')

urlpatterns = [
    path('summary/', LeaveSummaryReportView.as_view(), name='leave_summary_report'),
    path('hr-dashboard/', HRDashboardAnalyticsView.as_view(), name='hr_dashboard_analytics'),
    path('', include(router.urls)),
]
