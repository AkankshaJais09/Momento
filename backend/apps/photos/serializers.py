from rest_framework import serializers
from .models import Photo


class PhotoSerializer(serializers.Serializer):
    id = serializers.CharField(source="pk", read_only=True)
    event_id = serializers.CharField(read_only=True)
    file_path = serializers.CharField(read_only=True)
    original_filename = serializers.CharField(read_only=True)
    uploader_name = serializers.CharField(max_length=100, required=False, default="")
    uploaded_at = serializers.DateTimeField(read_only=True)
    file = serializers.ImageField(write_only=True)

    def create(self, validated_data):
        raise NotImplementedError("Use the view to handle file saving.")
