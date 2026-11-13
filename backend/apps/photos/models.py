import mongoengine as me
from datetime import datetime


class Photo(me.Document):
    """A photo uploaded to an event."""

    event_id = me.StringField(required=True)
    file_path = me.StringField(required=True)
    original_filename = me.StringField(required=True)
    uploader_name = me.StringField(max_length=100, default="")
    uploaded_at = me.DateTimeField(default=datetime.utcnow)

    meta = {
        "collection": "photos",
        "ordering": ["-uploaded_at"],
        "indexes": ["event_id"],
    }
