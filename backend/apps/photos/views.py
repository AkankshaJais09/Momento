# Photo views handling upload, listing, filtering, pagination, deletion, liking, and downloading.
# Only event members can view, upload, like, or download photos.

import io
import os
import zipfile
from datetime import datetime, timedelta
from bson import ObjectId
from django.conf import settings
from django.http import FileResponse, HttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from mongoengine.queryset.visitor import Q

from apps.accounts.models import User
from apps.events.models import Event, Membership
from apps.photos.models import Photo, Like, PhotoComment
from apps.photos.serializers import PhotoCommentSerializer, PhotoSerializer, photo_serializer_context
from apps.photos.services import process_and_save_photo, save_voice_note, validate_photo_file


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
        event, error = self._get_membership_or_error(request, event_id)
        if error:
            return error

        release_at = event.capsule_release_at
        is_owner = str(event.owner.id) == str(request.user.id)
        if release_at and release_at > timezone.now():
            if not (is_owner and request.query_params.get("include_hidden") == "true"):
                return Response(
                    {
                        "count": 0,
                        "total_pages": 1,
                        "current_page": 1,
                        "results": [],
                        "capsule_release_at": release_at,
                    },
                    status=status.HTTP_200_OK,
                )

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
            liked_photo_ids = Like._get_collection().distinct("photo", {"user": request.user.id})
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

        serializer = PhotoSerializer(
            paged_photos,
            many=True,
            context=photo_serializer_context(paged_photos, request),
        )
        response_data = {
            "count": total_count,
            "total_pages": total_pages,
            "current_page": page,
            "results": serializer.data,
        }
        if (
            page == 1
            and not uploader_param
            and request.query_params.get("mine", "").lower() not in ("true", "1")
            and request.query_params.get("favorites", "").lower() not in ("true", "1")
            and not day_param
        ):
            uploader_ids = Photo._get_collection().distinct("uploader", {"event": event.id})
            users = User.objects(id__in=uploader_ids).only("display_name")
            response_data["contributors"] = [
                {"id": str(user.id), "display_name": user.display_name}
                for user in users
            ]
        return Response(response_data, status=status.HTTP_200_OK)

    def post(self, request, event_id):
        event, error = self._get_membership_or_error(request, event_id)
        if error:
            return error
        if event.uploads_closed:
            return Response(
                {"detail": "Uploads are closed for this Momento."},
                status=status.HTTP_403_FORBIDDEN,
            )

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

        voice_file = request.FILES.get("voice_note")
        voice_duration = None
        voice_path = None
        if voice_file:
            if not event.voice_notes_enabled:
                return Response(
                    {"detail": "Voice notes are disabled for this Momento."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                voice_duration = float(request.data.get("voice_note_duration", 0))
            except (TypeError, ValueError):
                return Response(
                    {"detail": "Voice note duration is invalid."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not 0 < voice_duration <= 30:
                return Response(
                    {"detail": "Voice notes must be 30 seconds or shorter."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            voice_path = save_voice_note(voice_file, event)

        caption = str(request.data.get("caption", "")).strip()[:500]
        quest = str(request.data.get("quest", "")).strip()[:80]
        saved_photos = [
            process_and_save_photo(
                file,
                event,
                request.user,
                caption=caption,
                quest=quest,
                voice_note_path=voice_path if index == 0 else None,
                voice_note_duration=voice_duration if index == 0 else None,
            )
            for index, file in enumerate(files)
        ]

        serializer = PhotoSerializer(
            saved_photos,
            many=True,
            context=photo_serializer_context(saved_photos, request),
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# Detail view: Lets the photo uploader or event owner delete a photo.
class PhotoDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        photo = get_photo_or_none(pk)
        if photo is None:
            return Response({"detail": "Photo not found."}, status=status.HTTP_404_NOT_FOUND)

        event = photo.event
        is_member = Membership.objects(user=request.user, event=event).first() is not None
        if not is_member:
            return Response(
                {"detail": "You do not have permission to access this photo."},
                status=status.HTTP_403_FORBIDDEN,
            )

        release_at = event.capsule_release_at
        if release_at and release_at > timezone.now():
            return Response({"detail": "Photo not found."}, status=status.HTTP_404_NOT_FOUND)

        event_photos = Photo.objects(event=event)
        total_count = event_photos.count()
        newer_count = event_photos.filter(
            Q(taken_at__gt=photo.taken_at)
            | (Q(taken_at=photo.taken_at) & Q(created_at__gt=photo.created_at))
        ).count()
        serializer = PhotoSerializer(
            photo,
            context=photo_serializer_context([photo], request),
        )
        data = serializer.data
        data["position"] = newer_count + 1
        data["event_photo_count"] = total_count
        return Response(data, status=status.HTTP_200_OK)

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

        filename = f"momento-{photo.event.id}-{photo.id}.jpg"
        return FileResponse(open(full_path, "rb"), as_attachment=True, filename=filename)


class PhotoCommentsView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_photo(self, request, pk):
        photo = get_photo_or_none(pk)
        if photo is None:
            return None, Response({"detail": "Photo not found."}, status=status.HTTP_404_NOT_FOUND)
        if not Membership.objects(user=request.user, event=photo.event).first():
            return None, Response(
                {"detail": "You do not have permission to access comments for this photo."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return photo, None

    def get(self, request, pk):
        photo, error = self._get_photo(request, pk)
        if error:
            return error
        comments = PhotoComment.objects(photo=photo)
        serializer = PhotoCommentSerializer(
            comments,
            many=True,
            context={"request": request},
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, pk):
        photo, error = self._get_photo(request, pk)
        if error:
            return error

        text = str(request.data.get("text", "")).strip()[:1000]
        voice_file = request.FILES.get("voice_note")
        try:
            duration = float(request.data.get("voice_duration", 0)) if voice_file else None
        except (TypeError, ValueError):
            return Response(
                {"detail": "Voice comment duration is invalid."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not text and not voice_file:
            return Response(
                {"detail": "Add text or a voice comment."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if voice_file and (
            not photo.event.voice_notes_enabled or not 0 < duration <= 30
        ):
            return Response(
                {"detail": "Voice comments must be enabled and 30 seconds or shorter."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        voice_path = save_voice_note(voice_file, photo.event) if voice_file else None
        comment = PhotoComment(
            photo=photo,
            user=request.user,
            text=text,
            voice_file=voice_path,
            voice_duration=duration,
        ).save()
        serializer = PhotoCommentSerializer(comment, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


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
                    base_name = f"momento-{event.id}-{photo.id}.jpg"
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
