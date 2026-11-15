# Photo views handling upload, listing, filtering, pagination, deletion, liking, and downloading.
# Only event members can view, upload, like, or download photos.

import io
import os
import zipfile
from datetime import datetime, timedelta
from bson import ObjectId
from django.conf import settings
from django.http import FileResponse, HttpResponse
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.events.models import Event, Membership
from apps.photos.models import Photo, Like
from apps.photos.serializers import PhotoSerializer
from apps.photos.services import process_and_save_photo, validate_photo_file


def get_event_or_none(pk):
    """Find an event by its ID string or ObjectId."""
    try:
        if ObjectId.is_valid(pk):
            return Event.objects(id=ObjectId(pk)).first()
        return Event.objects(id=pk).first()
    except Exception:
        return None


def get_photo_or_none(pk):
    """Find a photo by its ID string or ObjectId."""
    try:
        if ObjectId.is_valid(pk):
            return Photo.objects(id=ObjectId(pk)).first()
        return Photo.objects(id=pk).first()
    except Exception:
        return None


# List and upload view: Lists photos with pagination and filters, or uploads multiple new photos.
class PhotoListUploadView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]

    def _get_membership_or_error(self, request, event_id):
        event = get_event_or_none(event_id)
        if event is None:
            return None, Response(
                {"detail": "Event not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        membership = Membership.objects(user=request.user, event=event).first()
        if not membership:
            return None, Response(
                {"detail": "You do not have permission to access photos for this event."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return event, None

    def get(self, request, event_id):
        # List photos ordered newest first, with query filters and 20-per-page pagination
        event, error = self._get_membership_or_error(request, event_id)
        if error:
            return error

        photos = Photo.objects(event=event).order_by("-taken_at", "-created_at")

        # Filter by specific uploader ID or email
        uploader_param = request.query_params.get("uploader")
        if uploader_param:
            if ObjectId.is_valid(uploader_param):
                photos = photos.filter(uploader=ObjectId(uploader_param))
            else:
                user = User.objects(email=uploader_param.strip().lower()).first()
                if user:
                    photos = photos.filter(uploader=user)
                else:
                    photos = photos.filter(id__in=[])

        # Filter by photos uploaded by the logged-in user
        if request.query_params.get("mine", "").lower() in ("true", "1"):
            photos = photos.filter(uploader=request.user)

        # Filter by photos liked by the logged-in user
        if request.query_params.get("favorites", "").lower() in ("true", "1"):
            liked_photo_ids = [like.photo.id for like in Like.objects(user=request.user) if like.photo]
            photos = photos.filter(id__in=liked_photo_ids)

        # Filter by photos taken on a specific calendar day (YYYY-MM-DD)
        day_param = request.query_params.get("day")
        if day_param:
            try:
                day_start = datetime.strptime(day_param.strip(), "%Y-%m-%d")
                day_end = day_start + timedelta(days=1)
                photos = photos.filter(taken_at__gte=day_start, taken_at__lt=day_end)
            except ValueError:
                pass

        # Simple page number pagination (20 per page)
        page_size = 20
        try:
            page = int(request.query_params.get("page", 1))
            if page < 1:
                page = 1
        except ValueError:
            page = 1

        total_count = photos.count()
        total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 1
        start = (page - 1) * page_size
        end = start + page_size
        paged_photos = list(photos[start:end])

        serializer = PhotoSerializer(paged_photos, many=True, context={"request": request})
        return Response(
            {
                "count": total_count,
                "total_pages": total_pages,
                "current_page": page,
                "results": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request, event_id):
        # Upload multiple photos to an event
        event, error = self._get_membership_or_error(request, event_id)
        if error:
            return error

        # Read uploaded files from form data
        files = request.FILES.getlist("files") or request.FILES.getlist("file") or list(request.FILES.values())

        if not files:
            return Response(
                {"detail": "No files provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        max_files = getattr(settings, "MAX_PHOTOS_PER_REQUEST", 50)
        if len(files) > max_files:
            return Response(
                {"detail": f"Maximum {max_files} files allowed per request."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate file size and format for all images before saving any
        for file in files:
            validate_photo_file(file)

        # Save files locally and create database records
        saved_photos = [process_and_save_photo(f, event, request.user) for f in files]

        serializer = PhotoSerializer(saved_photos, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# Detail view: Lets the photo uploader or event owner delete a photo.
class PhotoDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk, event_id=None):
        photo = get_photo_or_none(pk)
        if photo is None:
            return Response({"detail": "Photo not found."}, status=status.HTTP_404_NOT_FOUND)

        event = photo.event
        is_owner = str(event.owner.id) == str(request.user.id)
        is_uploader = str(photo.uploader.id) == str(request.user.id)

        if not (is_owner or is_uploader):
            return Response(
                {"detail": "You do not have permission to delete this photo."},
                status=status.HTTP_403_FORBIDDEN,
            )

        photo.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# Like view: Lets event members like or unlike a photo.
class PhotoLikeView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_photo_and_check_permission(self, request, pk):
        photo = get_photo_or_none(pk)
        if photo is None:
            return None, Response({"detail": "Photo not found."}, status=status.HTTP_404_NOT_FOUND)

        # Check if user is a member of the event this photo belongs to
        is_member = Membership.objects(user=request.user, event=photo.event).first() is not None
        if not is_member:
            return None, Response(
                {"detail": "You do not have permission to interact with this photo."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return photo, None

    def post(self, request, pk):
        # Like a photo
        photo, error = self._get_photo_and_check_permission(request, pk)
        if error:
            return error

        like = Like.objects(user=request.user, photo=photo).first()
        if not like:
            Like(user=request.user, photo=photo).save()

        like_count = Like.objects(photo=photo).count()
        return Response(
            {
                "detail": "Photo liked.",
                "like_count": like_count,
                "liked_by_me": True,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, pk):
        # Unlike a photo
        photo, error = self._get_photo_and_check_permission(request, pk)
        if error:
            return error

        Like.objects(user=request.user, photo=photo).delete()
        like_count = Like.objects(photo=photo).count()
        return Response(
            {
                "detail": "Photo unliked.",
                "like_count": like_count,
                "liked_by_me": False,
            },
            status=status.HTTP_200_OK,
        )


# Download view: Returns the untouched original photo file for event members.
class PhotoDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        photo = get_photo_or_none(pk)
        if photo is None:
            return Response({"detail": "Photo not found."}, status=status.HTTP_404_NOT_FOUND)

        # Ensure user is a member of the event
        is_member = Membership.objects(user=request.user, event=photo.event).first() is not None
        if not is_member:
            return Response(
                {"detail": "You do not have permission to download this photo."},
                status=status.HTTP_403_FORBIDDEN,
            )

        full_path = os.path.join(settings.MEDIA_ROOT, photo.original_file)
        if not os.path.exists(full_path):
            return Response(
                {"detail": "File not found on server."},
                status=status.HTTP_404_NOT_FOUND,
            )

        filename = photo.original_filename or os.path.basename(photo.original_file)
        return FileResponse(open(full_path, "rb"), as_attachment=True, filename=filename)


# Zip download view: Bundles selected photos into a zip file for members (max 50).
class EventPhotosZipDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        event = get_event_or_none(pk)
        if event is None:
            return Response({"detail": "Event not found."}, status=status.HTTP_404_NOT_FOUND)

        # Ensure user is a member of the event
        is_member = Membership.objects(user=request.user, event=event).first() is not None
        if not is_member:
            return Response(
                {"detail": "You do not have permission to download photos from this event."},
                status=status.HTTP_403_FORBIDDEN,
            )

        photo_ids = request.data.get("photo_ids") or request.data.get("photos")
        if not photo_ids or not isinstance(photo_ids, list):
            return Response(
                {"detail": "A list of photo_ids is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Enforce maximum 50 photos limit
        if len(photo_ids) > 50:
            return Response(
                {"detail": "Maximum 50 photos allowed per zip download."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Find valid photo documents belonging to this event
        valid_ids = [ObjectId(pid) for pid in photo_ids if ObjectId.is_valid(pid)]
        photos = list(Photo.objects(id__in=valid_ids, event=event))
        if not photos:
            return Response(
                {"detail": "No valid photos found to download."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Build zip file in memory using Python's built-in zipfile module
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            used_names = set()
            for photo in photos:
                full_path = os.path.join(settings.MEDIA_ROOT, photo.original_file)
                if os.path.exists(full_path):
                    base_name = photo.original_filename or os.path.basename(photo.original_file)
                    # Avoid duplicate file names inside zip archive
                    name = base_name
                    counter = 1
                    while name in used_names:
                        stem, ext = os.path.splitext(base_name)
                        name = f"{stem}_{counter}{ext}"
                        counter += 1
                    used_names.add(name)
                    zip_file.write(full_path, arcname=name)

        zip_buffer.seek(0)
        safe_name = "".join(c for c in event.name if c.isalnum() or c in (" ", "_", "-")).strip().replace(" ", "_")
        zip_filename = f"{safe_name or 'event'}_photos.zip"
        response = HttpResponse(zip_buffer.getvalue(), content_type="application/zip")
        response["Content-Disposition"] = f'attachment; filename="{zip_filename}"'
        return response
