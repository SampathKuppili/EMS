from rest_framework import serializers
from accounts.serializers import BasicUserSerializer
from .models import ReimbursementClaim


class ReimbursementClaimSerializer(serializers.ModelSerializer):
    employee = serializers.PrimaryKeyRelatedField(
        queryset=ReimbursementClaim._meta.get_field('employee').remote_field.model.objects.all(),
        required=False
    )
    employee_details = BasicUserSerializer(source='employee', read_only=True)
    reviewed_by_details = BasicUserSerializer(source='reviewed_by', read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    claim_number = serializers.CharField(read_only=True)
    merchant_name = serializers.CharField(source='merchant', required=False, allow_blank=True)
    receipt_file = serializers.FileField(source='receipt', required=False, allow_null=True)
    rejection_reason = serializers.CharField(source='review_notes', required=False, allow_blank=True)
    receipt_url = serializers.SerializerMethodField()

    class Meta:
        model = ReimbursementClaim
        fields = [
            'id',
            'claim_number',
            'employee',
            'employee_name',
            'employee_details',
            'reviewed_by',
            'reviewed_by_details',
            'title',
            'category',
            'category_display',
            'amount',
            'currency',
            'expense_date',
            'merchant',
            'merchant_name',
            'description',
            'receipt',
            'receipt_file',
            'receipt_url',
            'status',
            'status_display',
            'review_notes',
            'rejection_reason',
            'payment_reference',
            'reviewed_at',
            'paid_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'claim_number',
            'reviewed_by',
            'status',
            'status_display',
            'review_notes',
            'reviewed_at',
            'paid_at',
            'created_at',
            'updated_at',
        ]

    def get_receipt_url(self, obj):
        if not obj.receipt:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.receipt.url)
        return obj.receipt.url

    def create(self, validated_data):
        request = self.context.get('request')
        user = request.user if request and request.user.is_authenticated else validated_data.get('employee')
        validated_data['employee'] = user
        return super().create(validated_data)


class ReimbursementReviewActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['APPROVE', 'REJECT', 'MARK_PAID'])
    review_notes = serializers.CharField(required=False, allow_blank=True, default='')
    comments = serializers.CharField(required=False, allow_blank=True, default='')
    payment_reference = serializers.CharField(required=False, allow_blank=True, default='')
