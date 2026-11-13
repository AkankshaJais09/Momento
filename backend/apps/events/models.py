import mongoengine as me
import secrets
from datetime import datetime


class Event(me.Document):
    """A shared photo album for a group event."""

    name = me.StringField(required=True, max_length=200)
    description = me.StringField(max_length=1000, default="")
    invite_token = me.StringField(required=True, unique=True)
    created_at = me.DateTimeField(default=datetime.utcnow)
    updated_at = me.DateTimeField(default=datetime.utcnow)

    meta = {
        "collection": "events",
        "ordering": ["-created_at"],
        "indexes": ["invite_token"],
    }

    def save(self, *args, **kwargs):
        self.updated_at = datetime.utcnow()
        return super().save(*args, **kwargs)

    @classmethod
    def generate_invite_token(cls):
        return secrets.token_urlsafe(16)
