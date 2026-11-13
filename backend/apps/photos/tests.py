"""
Unit tests for the photos app.
"""
from apps.photos.models import Photo


class TestPhotoModel:
    def test_photo_has_required_fields(self):
        assert "event_id" in Photo._fields
        assert "file_path" in Photo._fields
        assert "original_filename" in Photo._fields
        assert "uploaded_at" in Photo._fields

    def test_event_id_is_indexed(self):
        meta_indexes = Photo._meta.get("indexes", [])
        assert "event_id" in meta_indexes
