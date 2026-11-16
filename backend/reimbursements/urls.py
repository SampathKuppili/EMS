from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReimbursementClaimViewSet

router = DefaultRouter()
router.register(r'claims', ReimbursementClaimViewSet, basename='reimbursement-claim')

urlpatterns = [
    path('', include(router.urls)),
]
