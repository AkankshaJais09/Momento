# Photo serializer converting Photo documents to JSON for API responses.
# Includes public image URLs, like counts, and whether current user liked the photo.

from rest_framework import serializers
from apps.photos.models import Photo, Like


class PhotoSerializer(serializers.Serializer):
    """Detailed serializer for Photo documents."""

    id = serializers.CharField(source="pk", read_only=True)
    event_id = serializers.SerializerMethodField()
    uploader = serializers.SerializerMethodField()
    original_file = serializers.CharField(read_only=True)
    original_url = serializers.CharField(read_only=True)
    thumbnail = serializers.CharField(read_only=True)
    thumbnail_url = serializers.CharField(read_only=True)
    medium_preview = serializers.CharField(read_only=True)
    medium_preview_url = serializers.CharField(read_only=True)
    width = serializers.IntegerField(read_only=True)
    height = serializers.IntegerField(read_only=True)
    taken_at = serializers.DateTimeField(read_only=True)
    size_bytes = serializers.IntegerField(read_only=True)
    like_count = serializers.SerializerMethodField()
    liked_by_me = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(read_only=True)

    # Legacy fields
    file_path = serializers.CharField(read_only=True)
    original_filename = serializers.CharField(read_only=True)
    uploaded_at = serializers.DateTimeField(read_only=True)

    def get_event_id(self, obj):
        if obj.event:
            return str(obj.event.id)
        return getattr(obj, "event_id", "")

    def get_uploader(self, obj):
        if obj.uploader:
            return {
                "id": str(obj.uploader.id),
                "email": obj.uploader.email,
                "display_name": getattr(obj.uploader, "display_name", ""),
            }
        return {
            "id": None,
            "email": "",
            "display_name": getattr(obj, "uploader_name", ""),
        }

    def get_like_count(self, obj):
        # Total number of likes on this photo
        return Like.objects(photo=obj).count()

    def get_liked_by_me(self, obj):
        # Check if currently logged in user liked this photo
        request = self.context.get("request")
        if request and getattr(request, "user", None) and request.user.is_authenticated:
            return Like.objects(user=request.user, photo=obj).first() is not None
        return False
