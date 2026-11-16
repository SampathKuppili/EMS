from rest_framework import serializers
from accounts.serializers import BasicUserSerializer
from .models import EmployeeDocument


class EmployeeDocumentSerializer(serializers.ModelSerializer):
    employee = serializers.PrimaryKeyRelatedField(
        queryset=EmployeeDocument._meta.get_field('employee').remote_field.model.objects.all(),
        required=False
    )
    employee_details = BasicUserSerializer(source='employee', read_only=True)
    uploaded_by_details = BasicUserSerializer(source='uploaded_by', read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    file_url = serializers.SerializerMethodField()
    file_name = serializers.SerializerMethodField()
    file = serializers.FileField(required=False)
    document_file = serializers.FileField(required=False)

    class Meta:
        model = EmployeeDocument
        fields = [
            'id',
            'employee',
            'employee_name',
            'employee_details',
            'uploaded_by',
            'uploaded_by_details',
            'title',
            'category',
            'category_display',
            'file',
            'document_file',
            'file_name',
            'file_url',
            'file_size',
            'file_type',
            'notes',
            'expiry_date',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'uploaded_by', 'file_size', 'file_type', 'created_at', 'updated_at']

    def validate(self, attrs):
        if not attrs.get('file') and not attrs.get('document_file') and not self.instance:
            raise serializers.ValidationError({'file': 'A file must be uploaded.'})
        if 'document_file' in attrs and 'file' not in attrs:
            attrs['file'] = attrs.pop('document_file')
        elif 'document_file' in attrs:
            attrs.pop('document_file')
        return attrs

    def get_file_name(self, obj):
        if obj.file and obj.file.name:
            import os
            return os.path.basename(obj.file.name)
        return ''

    def get_file_url(self, obj):
        if not obj.file:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url

    def create(self, validated_data):
        request = self.context.get('request')
        if 'uploaded_by' not in validated_data:
            validated_data['uploaded_by'] = request.user if request and request.user.is_authenticated else None

        file_obj = validated_data.get('file')
        if 'file_size' not in validated_data and file_obj:
            validated_data['file_size'] = getattr(file_obj, 'size', None)
        if 'file_type' not in validated_data and file_obj and hasattr(file_obj, 'content_type'):
            validated_data['file_type'] = file_obj.content_type

        return super().create(validated_data)
