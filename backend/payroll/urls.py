from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SalaryStructureViewSet,
    TaxDeductionViewSet,
    PayslipTemplateViewSet,
    PayslipViewSet,
)

router = DefaultRouter()
router.register(r'salaries', SalaryStructureViewSet, basename='salary-structure')
router.register(r'tax-deductions', TaxDeductionViewSet, basename='tax-deduction')
router.register(r'templates', PayslipTemplateViewSet, basename='payslip-template')
router.register(r'payslips', PayslipViewSet, basename='payslip')

urlpatterns = [
    path('', include(router.urls)),
]
