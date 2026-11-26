# Photo helper functions: validation, previews and saving.

import io
import secrets
from datetime import datetime
from django.conf import settings
from PIL import Image, ImageOps
from rest_framework import serializers

from apps.photos import storage
from apps.photos.models import Photo

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}


def validate_photo_file(file):
    """Check that file size is within limits and file is a real image."""
    max_size = getattr(settings, "MAX_PHOTO_SIZE_BYTES", 25 * 1024 * 1024)
    if file.size > max_size:
        raise serializers.ValidationError(
            "The selected image exceeds the maximum allowed size of 25MB."
        )

    try:
        file.seek(0)
        img = Image.open(file)
        img_format = img.format
        file.seek(0)
    except Exception:
        raise serializers.ValidationError(
            "The selected file is not a valid or supported image."
        )

    if not img_format or img_format.upper() not in ALLOWED_FORMATS:
        raise serializers.ValidationError(
            "The selected image format is not supported. Use JPEG, PNG or WebP."
        )


def get_taken_at(img):
    """Read photo taken time from EXIF, or fallback to current time."""
    try:
        exif = img.getexif()
        date_str = exif.get(36867) or exif.get(306)
        if date_str:
            return datetime.strptime(str(date_str).strip(), "%Y:%m:%d %H:%M:%S")
    except Exception:
        pass
    return datetime.utcnow()


def _jpeg_bytes(img, quality):
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=quality)
    return buffer.getvalue()


def save_voice_note(file, event):
    content_type = getattr(file, "content_type", "").split(";", 1)[0].lower()
    extension = {
        "audio/webm": ".weba",
        "audio/mp4": ".m4a",
        "audio/ogg": ".ogg",
        "audio/wav": ".wav",
    }.get(content_type, ".weba")
    filename = f"momento-{event.id}-{secrets.token_hex(3)}{extension}"
    rel_path = f"voice-notes/{event.id}/{filename}"
    file.seek(0)
    return storage.save_bytes(file.read(), rel_path, resource_type="video")


def process_and_save_photo(
    file,
    event,
    uploader,
    caption="",
    quest="",
    voice_note_path=None,
    voice_note_duration=None,
):
    """Re-encode the photo, make previews, store them and save a record."""
    file.seek(0)
    image = Image.open(file)
    taken_at = get_taken_at(image)

    oriented = ImageOps.exif_transpose(image) or image
    width, height = oriented.size

    unique_name = f"momento-{event.id}-{secrets.token_hex(3)}"
    filename = f"{unique_name}.jpg"
    preview_img = oriented.convert("RGB")

    original_bytes = _jpeg_bytes(preview_img, 92)
    size_bytes = len(original_bytes)
    orig_path = storage.save_bytes(
        original_bytes, f"photos/{event.id}/original/{filename}"
    )

    if storage.cloudinary_enabled():
        # Cloudinary creates cached, resized previews from the single original upload.
        medium_path = storage.transformed_url(orig_path, 800, 800)
        thumb_path = storage.transformed_url(orig_path, 400, 400)
    else:
        medium = preview_img.copy()
        medium.thumbnail((800, 800), Image.Resampling.LANCZOS)
        medium_path = storage.save_bytes(
            _jpeg_bytes(medium, 85), f"photos/{event.id}/medium/{filename}"
        )

        thumb = preview_img.copy()
        thumb.thumbnail((400, 400), Image.Resampling.LANCZOS)
        thumb_path = storage.save_bytes(
            _jpeg_bytes(thumb, 85), f"photos/{event.id}/thumbnail/{filename}"
        )

    photo = Photo(
        event=event,
        uploader=uploader,
        original_file=orig_path,
        thumbnail=thumb_path,
        medium_preview=medium_path,
        width=width,
        height=height,
        taken_at=taken_at,
        size_bytes=size_bytes,
        caption=caption,
        quest=quest,
        voice_note=voice_note_path,
        voice_note_duration=voice_note_duration,
        original_filename=filename,
    )
    photo.save()
    return photo
