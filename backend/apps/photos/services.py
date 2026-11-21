# Simple photo helper functions for file validation and thumbnail creation.
# Uses Pillow to validate image formats and create small previews.

import os
import secrets
from datetime import datetime
from django.conf import settings
from PIL import Image, ImageOps
from rest_framework import serializers

from apps.photos.models import Photo

# We only allow standard web images: JPEG, PNG and WebP
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


def save_voice_note(file, event):
    content_type = getattr(file, "content_type", "").split(";", 1)[0].lower()
    extension = {
        "audio/webm": ".weba",
        "audio/mp4": ".m4a",
        "audio/ogg": ".ogg",
        "audio/wav": ".wav",
    }.get(content_type, ".weba")
    filename = f"momento-{event.id}-{secrets.token_hex(3)}{extension}"
    relative_path = os.path.join("voice-notes", str(event.id), filename)
    full_path = os.path.join(settings.MEDIA_ROOT, relative_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "wb") as target:
        for chunk in file.chunks():
            target.write(chunk)
    return relative_path.replace(os.sep, "/")


def process_and_save_photo(
    file,
    event,
    uploader,
    caption="",
    quest="",
    voice_note_path=None,
    voice_note_duration=None,
):
    """Re-encode photos and create previews without retaining source metadata."""
    file.seek(0)
    image = Image.open(file)
    taken_at = get_taken_at(image)

    oriented = ImageOps.exif_transpose(image) or image
    width, height = oriented.size

    filename = f"momento-{event.id}-{secrets.token_hex(3)}.jpg"
    unique_name = os.path.splitext(filename)[0]
    original_directory = os.path.join(settings.MEDIA_ROOT, "photos", str(event.id), "original")
    orig_full_path = os.path.join(original_directory, filename)
    os.makedirs(original_directory, exist_ok=True)
    preview_img = oriented.convert("RGB")
    preview_img.save(orig_full_path, format="JPEG", quality=92)
    size_bytes = os.path.getsize(orig_full_path)
    orig_rel_path = f"photos/{event.id}/original/{filename}"

    # Save local previews using the same private, generated base name.
    medium_dir = os.path.join(settings.MEDIA_ROOT, "photos", str(event.id), "medium")
    os.makedirs(medium_dir, exist_ok=True)
    medium_full_path = os.path.join(medium_dir, f"{unique_name}.jpg")
    medium = preview_img.copy()
    medium.thumbnail((800, 800), Image.Resampling.LANCZOS)
    medium.save(medium_full_path, format="JPEG", quality=85)
    medium_rel_path = f"photos/{event.id}/medium/{unique_name}.jpg"

    # 3. Save small thumbnail (max 400x400)
    thumb_dir = os.path.join(settings.MEDIA_ROOT, "photos", str(event.id), "thumbnail")
    os.makedirs(thumb_dir, exist_ok=True)
    thumb_full_path = os.path.join(thumb_dir, f"{unique_name}.jpg")
    thumb = preview_img.copy()
    thumb.thumbnail((400, 400), Image.Resampling.LANCZOS)
    thumb.save(thumb_full_path, format="JPEG", quality=85)
    thumb_rel_path = f"photos/{event.id}/thumbnail/{unique_name}.jpg"

    # Save metadata record in MongoDB
    photo = Photo(
        event=event,
        uploader=uploader,
        original_file=orig_rel_path,
        thumbnail=thumb_rel_path,
        medium_preview=medium_rel_path,
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
