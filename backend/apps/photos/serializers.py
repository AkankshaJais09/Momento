# Photo serializer converting Photo documents to JSON for API responses.
# Includes public image URLs, like counts, and whether current user liked the photo.

from rest_framework import serializers
from django.conf import settings
from apps.photos.models import Photo, Like, PhotoComment


def photo_serializer_context(photos, request):
    photo_ids = [photo.id for photo in photos]
    context = {
        "request": request,
        "like_counts": {},
        "comment_counts": {},
        "liked_photo_ids": set(),
    }
    if not photo_ids:
        return context

    def counts_for(model, match=None):
        criteria = {"photo": {"$in": photo_ids}}
        if match:
            criteria.update(match)
        return {
            str(row["_id"]): row["count"]
            for row in model._get_collection().aggregate([
                {"$match": criteria},
                {"$group": {"_id": "$photo", "count": {"$sum": 1}}},
            ])
        }

    context["like_counts"] = counts_for(Like)
    context["comment_counts"] = counts_for(PhotoComment)
    if getattr(request, "user", None) and request.user.is_authenticated:
        context["liked_photo_ids"] = set(
            counts_for(Like, {"user": request.user.id})
        )
    return context


def can_view_user_email(request, user, event):
    viewer = getattr(request, "user", None)
    if not viewer or not viewer.is_authenticated:
        return False
    return str(viewer.id) == str(user.id) or str(viewer.id) == str(event.owner.id)


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
    caption = serializers.CharField(read_only=True)
    quest = serializers.CharField(read_only=True)
    voice_note_url = serializers.SerializerMethodField()
    voice_note_duration = serializers.FloatField(read_only=True, allow_null=True)
    comment_count = serializers.SerializerMethodField()
    like_count = serializers.SerializerMethodField()
    liked_by_me = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(read_only=True)

    file_path = serializers.CharField(read_only=True)
    uploaded_at = serializers.DateTimeField(read_only=True)

    def get_event_id(self, obj):
        if obj.event:
            return str(obj.event.id)
        return getattr(obj, "event_id", "")

    def get_uploader(self, obj):
        if obj.uploader:
            uploader = {
                "id": str(obj.uploader.id),
                "display_name": getattr(obj.uploader, "display_name", ""),
            }
            if can_view_user_email(self.context.get("request"), obj.uploader, obj.event):
                uploader["email"] = obj.uploader.email
            return uploader
        return {
            "id": None,
            "display_name": getattr(obj, "uploader_name", ""),
        }

    def get_voice_note_url(self, obj):
        return f"{settings.MEDIA_URL}{obj.voice_note}" if obj.voice_note else None

    def get_comment_count(self, obj):
        counts = self.context.get("comment_counts")
        if counts is not None:
            return counts.get(str(obj.id), 0)
        return PhotoComment.objects(photo=obj).count()

    def get_like_count(self, obj):
        counts = self.context.get("like_counts")
        if counts is not None:
            return counts.get(str(obj.id), 0)
        # Total number of likes on this photo
        return Like.objects(photo=obj).count()

    def get_liked_by_me(self, obj):
        liked_photo_ids = self.context.get("liked_photo_ids")
        if liked_photo_ids is not None:
            return str(obj.id) in liked_photo_ids
        # Check if currently logged in user liked this photo
        request = self.context.get("request")
        if request and getattr(request, "user", None) and request.user.is_authenticated:
            return Like.objects(user=request.user, photo=obj).first() is not None
        return False


class PhotoCommentSerializer(serializers.Serializer):
    id = serializers.CharField(source="pk", read_only=True)
    text = serializers.CharField(read_only=True)
    voice_url = serializers.SerializerMethodField()
    voice_duration = serializers.FloatField(read_only=True, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)
    user = serializers.SerializerMethodField()

    def get_voice_url(self, obj):
        return f"{settings.MEDIA_URL}{obj.voice_file}" if obj.voice_file else None

    def get_user(self, obj):
        user = {
            "display_name": obj.user.display_name,
        }
        if can_view_user_email(self.context.get("request"), obj.user, obj.photo.event):
            user["email"] = obj.user.email
        return user
