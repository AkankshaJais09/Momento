# Saves, reads and deletes media files.
# Uses Cloudinary when it is configured, otherwise the local media/ folder.

import io
import os
import re
import urllib.request

from django.conf import settings


def cloudinary_enabled():
    return bool(getattr(settings, "CLOUDINARY_CLOUD_NAME", ""))


def is_remote(value):
    return bool(value) and str(value).startswith("http")


def public_url(value):
    """URL the browser can open for a stored value."""
    if is_remote(value):
        return value
    return f"{settings.MEDIA_URL}{value}"


def save_bytes(data, rel_path, resource_type="image"):
    """Save file bytes. Returns a Cloudinary URL or a local relative path."""
    if cloudinary_enabled():
        import cloudinary.uploader

        public_id = "momento/" + os.path.splitext(rel_path)[0]
        result = cloudinary.uploader.upload(
            io.BytesIO(data),
            public_id=public_id,
            resource_type=resource_type,
            overwrite=True,
        )
        return result["secure_url"]

    full_path = os.path.join(settings.MEDIA_ROOT, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "wb") as target:
        target.write(data)
    return rel_path


def read_bytes(value):
    """Read a stored file back as bytes. Returns None if it is missing."""
    if not value:
        return None
    if is_remote(value):
        try:
            with urllib.request.urlopen(value, timeout=30) as response:
                return response.read()
        except Exception:
            return None
    full_path = os.path.join(settings.MEDIA_ROOT, value)
    if not os.path.exists(full_path):
        return None
    with open(full_path, "rb") as source:
        return source.read()


def delete_file(value):
    """Delete a stored file. Never raises."""
    if not value:
        return
    if is_remote(value):
        match = re.search(
            r"/(image|video|raw)/upload/(?:v\d+/)?(.+?)(?:\.[A-Za-z0-9]+)?$", value
        )
        if match and cloudinary_enabled():
            try:
                import cloudinary.uploader

                cloudinary.uploader.destroy(
                    match.group(2), resource_type=match.group(1)
                )
            except Exception:
                pass
        return
    full_path = os.path.join(settings.MEDIA_ROOT, value)
    if os.path.exists(full_path):
        try:
            os.remove(full_path)
        except OSError:
            pass