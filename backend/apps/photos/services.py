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
            f"File '{file.name}' exceeds the maximum allowed size of 25MB."
        )

    try:
        file.seek(0)
        img = Image.open(file)
        img_format = img.format
        file.seek(0)
    except Exception:
        raise serializers.ValidationError(
            f"File '{file.name}' is not a valid or supported image file."
        )

    if not img_format or img_format.upper() not in ALLOWED_FORMATS:
        raise serializers.ValidationError(
            f"File '{file.name}' is not a supported image format. Supported formats are JPEG, PNG and WebP."
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


def process_and_save_photo(file, event, uploader):
    """Save original photo locally and generate thumbnail and medium previews."""
    file.seek(0)
    raw_bytes = file.read()
    size_bytes = len(raw_bytes)

    # Open image with Pillow to read size and metadata
    file.seek(0)
    image = Image.open(file)
    taken_at = get_taken_at(image)

    # Rotate image according to EXIF orientation tag if present
    oriented = ImageOps.exif_transpose(image) or image
    width, height = oriented.size

    # Choose a unique filename to avoid overwriting existing files
    ext = os.path.splitext(file.name)[1].lower() or ".jpg"
    unique_name = secrets.token_hex(8)

    # 1. Save untouched original file in media/photos/<event_id>/original/
    orig_dir = os.path.join(settings.MEDIA_ROOT, "photos", str(event.id), "original")
    os.makedirs(orig_dir, exist_ok=True)
    orig_full_path = os.path.join(orig_dir, f"{unique_name}{ext}")
    with open(orig_full_path, "wb") as f:
        f.write(raw_bytes)
    orig_rel_path = f"photos/{event.id}/original/{unique_name}{ext}"

    # Convert to RGB for saving previews as JPEG
    preview_img = oriented.convert("RGB") if oriented.mode != "RGB" else oriented.copy()

    # 2. Save medium preview (max 1600x1600)
    medium_dir = os.path.join(settings.MEDIA_ROOT, "photos", str(event.id), "medium")
    os.makedirs(medium_dir, exist_ok=True)
    medium_full_path = os.path.join(medium_dir, f"{unique_name}.jpg")
    medium = preview_img.copy()
    medium.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
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
        original_filename=file.name or f"{unique_name}{ext}",
    )
    photo.save()
    return photo
