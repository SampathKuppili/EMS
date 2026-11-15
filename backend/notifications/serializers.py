from rest_framework import serializers
from notifications.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id',
            'title',
            'message',
            'link',
            'is_read',
            'read_at',
            'created_at',
        ]
        read_only_fields = ['id', 'title', 'message', 'link', 'read_at', 'created_at']
