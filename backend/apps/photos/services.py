# Photo and Like models storing photo metadata and user likes.
# Files are stored on Cloudinary (or locally in development); records live in MongoDB.

from datetime import datetime
import mongoengine as me
from apps.accounts.models import User
from apps.events.models import Event
from apps.photos import storage


# Photo model: Stores uploaded picture metadata and where the files are.
class Photo(me.Document):
    event = me.ReferenceField(Event, required=True, reverse_delete_rule=me.CASCADE)
    uploader = me.ReferenceField(User, required=True, reverse_delete_rule=me.CASCADE)
    original_file = me.StringField(required=True)
    thumbnail = me.StringField(required=True)
    medium_preview = me.StringField(required=True)
    width = me.IntField(required=True)
    height = me.IntField(required=True)
    taken_at = me.DateTimeField(required=True)
    size_bytes = me.IntField(required=True)
    caption = me.StringField(default="", max_length=500)
    quest = me.StringField(default="", max_length=80)
    voice_note = me.StringField(null=True, default=None)
    voice_note_duration = me.FloatField(null=True, default=None)
    created_at = me.DateTimeField(default=datetime.utcnow)

    # Legacy fields kept for backward compatibility with initial project skeleton
    event_id = me.StringField()
    file_path = me.StringField()
    original_filename = me.StringField(default="")
    uploader_name = me.StringField(default="")
    uploaded_at = me.DateTimeField(default=datetime.utcnow)

    meta = {
        "collection": "photos",
        "ordering": ["-taken_at", "-created_at"],
        "indexes": [
            "event",
            "uploader",
            "event_id",
            {"fields": ["event", "-taken_at", "-created_at"]},
        ],
    }

    def save(self, *args, **kwargs):
        # Auto-fill legacy fields from main references
        if self.event and not self.event_id:
            self.event_id = str(self.event.id)
        if self.original_file and not self.file_path:
            self.file_path = self.original_file
        if self.uploader and not self.uploader_name:
            self.uploader_name = getattr(self.uploader, "display_name", "")
        if not self.uploaded_at:
            self.uploaded_at = self.created_at or datetime.utcnow()
        return super().save(*args, **kwargs)

    @property
    def original_url(self):
        return storage.public_url(self.original_file)

    @property
    def thumbnail_url(self):
        return storage.public_url(self.thumbnail)

    @property
    def medium_preview_url(self):
        return storage.public_url(self.medium_preview)

    def delete(self, *args, **kwargs):
        # Clean up likes associated with this photo
        Like.objects(photo=self).delete()

        # Remove the stored files (Cloudinary or local)
        for stored in (
            self.original_file,
            self.thumbnail,
            self.medium_preview,
            self.voice_note,
        ):
            storage.delete_file(stored)
        return super().delete(*args, **kwargs)

    def __str__(self):
        return f"Photo {self.id} for Event {self.event_id}"


class PhotoComment(me.Document):
    photo = me.ReferenceField(Photo, required=True, reverse_delete_rule=me.CASCADE)
    user = me.ReferenceField(User, required=True, reverse_delete_rule=me.CASCADE)
    text = me.StringField(default="", max_length=1000)
    voice_file = me.StringField(null=True, default=None)
    voice_duration = me.FloatField(null=True, default=None)
    created_at = me.DateTimeField(default=datetime.utcnow)

    meta = {
        "collection": "photo_comments",
        "ordering": ["created_at"],
        "indexes": ["photo", "user"],
    }


# Like model: Connects a user to a photo they marked as a favorite.
class Like(me.Document):
    user = me.ReferenceField(User, required=True, reverse_delete_rule=me.CASCADE)
    photo = me.ReferenceField(Photo, required=True, reverse_delete_rule=me.CASCADE)
    created_at = me.DateTimeField(default=datetime.utcnow)

    meta = {
        "collection": "likes",
        "ordering": ["-created_at"],
        "indexes": [
            {"fields": ["user", "photo"], "unique": True},
            "photo",
            "user",
        ],
    }

    def __str__(self):
        return f"{self.user.email} likes {self.photo.id}"