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
    if not value:
        return ""
    value = str(value)
    # If a full web link is inside the value, return just that link.
    for marker in ("https://", "http://"):
        position = value.find(marker)
        if position != -1:
            return value[position:]
    return f"{settings.MEDIA_URL}{value}"


def transformed_url(value, width, height):
    """Build a small Cloudinary preview from the uploaded original."""
    if not cloudinary_enabled() or not is_remote(value):
        return value
    marker = "/upload/"
    if marker not in value:
        return value
    remainder = value.split(marker, 1)[1]
    if remainder.startswith("f_auto,"):
        return value
    transform = f"f_auto,q_auto,c_limit,w_{width},h_{height}"
    return value.replace(marker, f"{marker}{transform}/", 1)


def asset_key(value):
    """Identify the Cloudinary file behind original and transformed URLs."""
    if not is_remote(value):
        return value
    match = re.search(r"/(image|video|raw)/upload/(.*)$", str(value))
    if not match:
        return value
    resource_type, remainder = match.groups()
    parts = remainder.split("/")
    version_index = next(
        (index for index, part in enumerate(parts) if re.fullmatch(r"v\d+", part)),
        None,
    )
    if version_index is not None:
        remainder = "/".join(parts[version_index + 1 :])
    remainder = re.sub(r"\.[A-Za-z0-9]+$", "", remainder)
    return f"{resource_type}/{remainder}"


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
        key = asset_key(value)
        if key and cloudinary_enabled() and key != value:
            try:
                import cloudinary.uploader

                resource_type, public_id = key.split("/", 1)
                cloudinary.uploader.destroy(public_id, resource_type=resource_type)
            except Exception:
                pass
        return
    full_path = os.path.join(settings.MEDIA_ROOT, value)
    if os.path.exists(full_path):
        try:
            os.remove(full_path)
        except OSError:
            pass
