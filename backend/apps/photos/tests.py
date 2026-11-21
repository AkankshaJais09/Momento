from datetime import datetime, timedelta
import io
import mimetypes
import os
import mongoengine
import mongomock
from PIL import Image
import pytest
from django.conf import settings
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User
from apps.events.models import Event, Membership
from apps.photos.models import Photo, Like, PhotoComment
from apps.photos.services import save_voice_note


@pytest.fixture(autouse=True)
def setup_test_db(tmp_path):
    """Isolate tests in mock database, temporary media directory, and reset cache."""
    mongoengine.disconnect()
    mongoengine.connect("test_photos_db", host="localhost", mongo_client_class=mongomock.MongoClient)
    Photo.drop_collection()
    Like.drop_collection()
    PhotoComment.drop_collection()
    Event.drop_collection()
    Membership.drop_collection()
    User.drop_collection()
    cache.clear()

    old_media_root = settings.MEDIA_ROOT
    settings.MEDIA_ROOT = str(tmp_path)

    yield

    settings.MEDIA_ROOT = old_media_root
    Photo.drop_collection()
    Like.drop_collection()
    PhotoComment.drop_collection()
    Event.drop_collection()
    Membership.drop_collection()
    User.drop_collection()
    cache.clear()
    mongoengine.disconnect()


def create_user(email="user@example.com", name="Test User"):
    user = User(email=email, display_name=name)
    user.set_password("SecurePass123")
    user.save()
    return user


def auth_client_for(user):
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return client


def make_image_file(name="test.jpg", format="JPEG", size=(600, 400), color="blue", exif=None):
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    if exif is not None:
        img.save(buf, format=format, exif=exif)
    else:
        img.save(buf, format=format)
    buf.seek(0)
    content_type = f"image/{format.lower()}"
    return SimpleUploadedFile(name, buf.getvalue(), content_type=content_type)


class TestPhotoModelBasics:
    def test_photo_and_like_have_required_fields(self):
        # Legacy fields
        assert "event_id" in Photo._fields
        assert "file_path" in Photo._fields
        assert "original_filename" in Photo._fields
        assert "caption" in Photo._fields
        assert "quest" in Photo._fields
        assert "voice_note" in Photo._fields
        assert "uploaded_at" in Photo._fields

        # Main Photo fields
        assert "event" in Photo._fields
        assert "uploader" in Photo._fields
        assert "original_file" in Photo._fields
        assert "thumbnail" in Photo._fields
        assert "medium_preview" in Photo._fields
        assert "width" in Photo._fields
        assert "height" in Photo._fields
        assert "taken_at" in Photo._fields
        assert "size_bytes" in Photo._fields
        assert "created_at" in Photo._fields

        # Like model fields
        assert "user" in Like._fields
        assert "photo" in Like._fields
        assert "created_at" in Like._fields


class TestVoiceNoteStorage:
    def test_webm_voice_note_uses_audio_mime_extension_and_generated_name(self):
        owner = create_user()
        event = Event(name="Voice note", owner=owner).save()
        recording = SimpleUploadedFile(
            "recording.webm",
            b"voice recording",
            content_type="audio/webm;codecs=opus",
        )

        relative_path = save_voice_note(recording, event)

        assert relative_path.startswith(f"voice-notes/{event.id}/momento-{event.id}-")
        assert relative_path.endswith(".weba")
        with open(os.path.join(settings.MEDIA_ROOT, relative_path), "rb") as saved:
            assert saved.read() == b"voice recording"


class TestPhotoUploadSuccess:
    def test_valid_photo_upload_single_file(self):
        owner = create_user("owner@example.com")
        event = Event(name="Vacation", owner=owner).save()
        Membership(user=owner, event=event, role=Membership.ROLE_OWNER).save()

        client = auth_client_for(owner)
        img_file = make_image_file("vacation.jpg", "JPEG", size=(800, 600))

        response = client.post(
            f"/api/events/{event.id}/photos/",
            {"files": [img_file]},
            format="multipart",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.data) == 1
        photo_data = response.data[0]

        assert photo_data["width"] == 800
        assert photo_data["height"] == 600
        assert photo_data["size_bytes"] > 0
        assert photo_data["like_count"] == 0
        assert photo_data["liked_by_me"] is False
        assert "original_url" in photo_data
        assert "thumbnail_url" in photo_data
        assert "medium_preview_url" in photo_data

        # Verify photo document in MongoDB
        photo = Photo.objects.first()
        assert photo is not None
        assert photo.event.id == event.id
        assert photo.uploader.id == owner.id

        # Verify the original is re-encoded with a generated private name.
        orig_full_path = os.path.join(settings.MEDIA_ROOT, photo.original_file)
        assert os.path.exists(orig_full_path)
        assert photo.original_filename.startswith(f"momento-{event.id}-")
        assert len(photo.original_filename.removeprefix(f"momento-{event.id}-").removesuffix(".jpg")) == 6
        with Image.open(orig_full_path) as saved_image:
            assert saved_image.format == "JPEG"
            assert not saved_image.getexif()

        # Verify thumbnail and medium preview files exist on disk
        thumb_full_path = os.path.join(settings.MEDIA_ROOT, photo.thumbnail)
        medium_full_path = os.path.join(settings.MEDIA_ROOT, photo.medium_preview)
        assert os.path.exists(thumb_full_path)
        assert os.path.exists(medium_full_path)

    def test_medium_preview_is_capped_at_800px_without_shrinking_original(self):
        owner = create_user("owner@example.com")
        event = Event(name="Preview size", owner=owner).save()
        Membership(user=owner, event=event, role=Membership.ROLE_OWNER).save()

        response = auth_client_for(owner).post(
            f"/api/events/{event.id}/photos/",
            {"files": [make_image_file(size=(2400, 1600))]},
            format="multipart",
        )

        assert response.status_code == status.HTTP_201_CREATED
        photo = Photo.objects.first()
        with Image.open(os.path.join(settings.MEDIA_ROOT, photo.original_file)) as original:
            assert original.size == (2400, 1600)
        with Image.open(os.path.join(settings.MEDIA_ROOT, photo.medium_preview)) as preview:
            assert preview.size == (800, 533)

    def test_valid_photo_upload_multiple_files(self):
        owner = create_user("owner@example.com")
        event = Event(name="Multi Upload", owner=owner).save()
        Membership(user=owner, event=event, role=Membership.ROLE_OWNER).save()

        client = auth_client_for(owner)
        f1 = make_image_file("pic1.jpg", "JPEG", size=(400, 300))
        f2 = make_image_file("pic2.png", "PNG", size=(500, 400))
        f3 = make_image_file("pic3.webp", "WEBP", size=(600, 500))

        response = client.post(
            f"/api/events/{event.id}/photos/",
            {"files": [f1, f2, f3]},
            format="multipart",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.data) == 3
        assert Photo.objects.count() == 3

    def test_voice_note_upload_is_saved_and_returned_with_audio_url(self):
        owner = create_user("owner@example.com")
        event = Event(name="Voice upload", owner=owner).save()
        Membership(user=owner, event=event, role=Membership.ROLE_OWNER).save()
        client = auth_client_for(owner)

        response = client.post(
            f"/api/events/{event.id}/photos/",
            {
                "files": [make_image_file()],
                "voice_note": SimpleUploadedFile(
                    "voice-note.webm",
                    b"recorded audio",
                    content_type="audio/webm;codecs=opus",
                ),
                "voice_note_duration": "4",
            },
            format="multipart",
        )

        photo = Photo.objects.first()
        assert response.status_code == status.HTTP_201_CREATED
        assert photo.voice_note.endswith(".weba")
        assert response.data[0]["voice_note_url"].endswith(photo.voice_note)
        with open(os.path.join(settings.MEDIA_ROOT, photo.voice_note), "rb") as saved:
            assert saved.read() == b"recorded audio"
        assert mimetypes.guess_type(photo.voice_note)[0] == "audio/webm"


class TestPhotoIdentityPrivacy:
    def test_photo_email_is_visible_to_host_and_uploader_only(self):
        owner = create_user("owner@example.com", "Host")
        uploader = create_user("uploader@example.com", "Uploader")
        guest = create_user("guest@example.com", "Guest")
        event = Event(name="Private emails", owner=owner).save()
        for user, role in (
            (owner, Membership.ROLE_OWNER),
            (uploader, Membership.ROLE_MEMBER),
            (guest, Membership.ROLE_MEMBER),
        ):
            Membership(user=user, event=event, role=role).save()
        Photo(
            event=event,
            uploader=uploader,
            original_file="photo.jpg",
            thumbnail="photo-thumbnail.jpg",
            medium_preview="photo-preview.jpg",
            width=100,
            height=100,
            taken_at=datetime.utcnow(),
            size_bytes=100,
        ).save()

        host_photo = auth_client_for(owner).get(f"/api/events/{event.id}/photos/").data["results"][0]
        uploader_photo = auth_client_for(uploader).get(f"/api/events/{event.id}/photos/").data["results"][0]
        guest_photo = auth_client_for(guest).get(f"/api/events/{event.id}/photos/").data["results"][0]

        assert host_photo["uploader"]["email"] == uploader.email
        assert uploader_photo["uploader"]["email"] == uploader.email
        assert "email" not in guest_photo["uploader"]

    def test_comment_send_saves_name_and_hides_email_from_other_guests(self):
        owner = create_user("owner@example.com", "Host")
        author = create_user("author@example.com", "Comment Author")
        guest = create_user("guest@example.com", "Guest")
        event = Event(name="Comments", owner=owner).save()
        for user, role in (
            (owner, Membership.ROLE_OWNER),
            (author, Membership.ROLE_MEMBER),
            (guest, Membership.ROLE_MEMBER),
        ):
            Membership(user=user, event=event, role=role).save()
        photo = Photo(
            event=event,
            uploader=author,
            original_file="photo.jpg",
            thumbnail="photo-thumbnail.jpg",
            medium_preview="photo-preview.jpg",
            width=100,
            height=100,
            taken_at=datetime.utcnow(),
            size_bytes=100,
        ).save()

        author_response = auth_client_for(author).post(
            f"/api/photos/{photo.id}/comments/",
            {"text": "A lovely moment"},
            format="json",
        )
        guest_response = auth_client_for(guest).get(f"/api/photos/{photo.id}/comments/")
        host_response = auth_client_for(owner).get(f"/api/photos/{photo.id}/comments/")

        assert author_response.status_code == status.HTTP_201_CREATED
        assert author_response.data["user"]["display_name"] == author.display_name
        assert author_response.data["user"]["email"] == author.email
        assert "email" not in guest_response.data[0]["user"]
        assert host_response.data[0]["user"]["email"] == author.email


class TestPhotoUploadValidation:
    def test_invalid_file_format_rejected(self):
        owner = create_user("owner@example.com")
        event = Event(name="Event", owner=owner).save()
        Membership(user=owner, event=event, role=Membership.ROLE_OWNER).save()

        client = auth_client_for(owner)
        text_file = SimpleUploadedFile("notes.txt", b"Hello plain text", content_type="text/plain")

        response = client.post(
            f"/api/events/{event.id}/photos/",
            {"files": [text_file]},
            format="multipart",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "not a valid or supported image" in str(response.data).lower() or "supported" in str(response.data).lower()

    def test_corrupted_image_file_rejected(self):
        owner = create_user("owner@example.com")
        event = Event(name="Event", owner=owner).save()
        Membership(user=owner, event=event, role=Membership.ROLE_OWNER).save()

        client = auth_client_for(owner)
        fake_jpg = SimpleUploadedFile("fake.jpg", b"corrupted bytes", content_type="image/jpeg")

        response = client.post(
            f"/api/events/{event.id}/photos/",
            {"files": [fake_jpg]},
            format="multipart",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "not a valid or supported image" in str(response.data).lower()

    @override_settings(MAX_PHOTO_SIZE_BYTES=500)
    def test_oversized_file_rejected(self):
        owner = create_user("owner@example.com")
        event = Event(name="Event", owner=owner).save()
        Membership(user=owner, event=event, role=Membership.ROLE_OWNER).save()

        client = auth_client_for(owner)
        large_img = make_image_file("large.jpg", "JPEG", size=(300, 300))

        response = client.post(
            f"/api/events/{event.id}/photos/",
            {"files": [large_img]},
            format="multipart",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "exceeds the maximum allowed size" in str(response.data).lower()

    def test_no_files_provided_rejected(self):
        owner = create_user("owner@example.com")
        event = Event(name="Event", owner=owner).save()
        Membership(user=owner, event=event, role=Membership.ROLE_OWNER).save()

        client = auth_client_for(owner)
        response = client.post(f"/api/events/{event.id}/photos/", {}, format="multipart")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "no files provided" in str(response.data).lower()


class TestPhotoPaginationAndOrdering:
    def test_photos_ordered_newest_first_and_paginated_20_per_page(self):
        owner = create_user("owner@example.com")
        event = Event(name="Paginated Event", owner=owner).save()
        Membership(user=owner, event=event, role=Membership.ROLE_OWNER).save()

        # Create 25 photos with different taken_at timestamps
        base_time = datetime(2026, 11, 10, 10, 0, 0)
        for i in range(25):
            Photo(
                event=event,
                uploader=owner,
                original_file=f"photos/{event.id}/original/pic_{i}.jpg",
                thumbnail=f"photos/{event.id}/thumbnail/pic_{i}.jpg",
                medium_preview=f"photos/{event.id}/medium/pic_{i}.jpg",
                width=100,
                height=100,
                taken_at=base_time + timedelta(hours=i),
                size_bytes=1000,
            ).save()

        client = auth_client_for(owner)

        # Page 1 should return 20 items ordered newest first
        res_p1 = client.get(f"/api/events/{event.id}/photos/?page=1")
        assert res_p1.status_code == status.HTTP_200_OK
        assert res_p1.data["count"] == 25
        assert res_p1.data["total_pages"] == 2
        assert res_p1.data["current_page"] == 1
        assert len(res_p1.data["results"]) == 20

        # Check newest first: first item has newest taken_at
        p1_first = res_p1.data["results"][0]
        p1_last = res_p1.data["results"][-1]
        assert p1_first["taken_at"] > p1_last["taken_at"]

        # Page 2 should return remaining 5 items
        res_p2 = client.get(f"/api/events/{event.id}/photos/?page=2")
        assert res_p2.status_code == status.HTTP_200_OK
        assert len(res_p2.data["results"]) == 5

    def test_photo_detail_returns_single_photo_and_position(self):
        owner = create_user("owner@example.com")
        event = Event(name="Photo detail", owner=owner).save()
        Membership(user=owner, event=event, role=Membership.ROLE_OWNER).save()
        base_time = datetime(2026, 11, 10, 10, 0, 0)
        photos = [
            Photo(
                event=event,
                uploader=owner,
                original_file=f"original-{index}.jpg",
                thumbnail=f"thumbnail-{index}.jpg",
                medium_preview=f"preview-{index}.jpg",
                width=100,
                height=100,
                taken_at=base_time + timedelta(hours=index),
                size_bytes=100,
            ).save()
            for index in range(3)
        ]

        response = auth_client_for(owner).get(f"/api/photos/{photos[1].id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == str(photos[1].id)
        assert response.data["position"] == 2
        assert response.data["event_photo_count"] == 3

    def test_photo_list_includes_aggregated_like_and_comment_counts(self):
        owner = create_user("owner@example.com")
        guest = create_user("guest@example.com")
        event = Event(name="Photo counts", owner=owner).save()
        Membership(user=owner, event=event, role=Membership.ROLE_OWNER).save()
        Membership(user=guest, event=event, role=Membership.ROLE_MEMBER).save()
        first = Photo(
            event=event,
            uploader=guest,
            original_file="first.jpg",
            thumbnail="first-thumb.jpg",
            medium_preview="first-preview.jpg",
            width=100,
            height=100,
            taken_at=datetime(2026, 11, 10, 10, 0, 0),
            size_bytes=100,
        ).save()
        Photo(
            event=event,
            uploader=guest,
            original_file="second.jpg",
            thumbnail="second-thumb.jpg",
            medium_preview="second-preview.jpg",
            width=100,
            height=100,
            taken_at=datetime(2026, 11, 10, 11, 0, 0),
            size_bytes=100,
        ).save()
        Like(user=owner, photo=first).save()
        PhotoComment(photo=first, user=guest, text="Lovely moment").save()

        response = auth_client_for(owner).get(f"/api/events/{event.id}/photos/")
        by_id = {photo["id"]: photo for photo in response.data["results"]}

        assert response.status_code == status.HTTP_200_OK
        assert by_id[str(first.id)]["like_count"] == 1
        assert by_id[str(first.id)]["liked_by_me"] is True
        assert by_id[str(first.id)]["comment_count"] == 1


class TestPhotoFilters:
    def test_filter_by_uploader(self):
        owner = create_user("owner@example.com")
        member = create_user("member@example.com")
        event = Event(name="Filter Event", owner=owner).save()
        Membership(user=owner, event=event, role=Membership.ROLE_OWNER).save()
        Membership(user=member, event=event, role=Membership.ROLE_MEMBER).save()

        # 2 photos by owner, 1 by member
        p1 = Photo(
            event=event,
            uploader=owner,
            original_file="o1.jpg",
            thumbnail="o1_t.jpg",
            medium_preview="o1_m.jpg",
            width=100,
            height=100,
            taken_at=datetime.utcnow(),
            size_bytes=100,
        ).save()
        p2 = Photo(
            event=event,
            uploader=owner,
            original_file="o2.jpg",
            thumbnail="o2_t.jpg",
            medium_preview="o2_m.jpg",
            width=100,
            height=100,
            taken_at=datetime.utcnow(),
            size_bytes=100,
        ).save()
        p3 = Photo(
            event=event,
            uploader=member,
            original_file="m1.jpg",
            thumbnail="m1_t.jpg",
            medium_preview="m1_m.jpg",
            width=100,
            height=100,
            taken_at=datetime.utcnow(),
            size_bytes=100,
        ).save()

        client = auth_client_for(owner)

        # Filter by member uploader
        res = client.get(f"/api/events/{event.id}/photos/?uploader={str(member.id)}")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["count"] == 1
        assert res.data["results"][0]["id"] == str(p3.id)

    def test_filter_by_mine(self):
        owner = create_user("owner@example.com")
        member = create_user("member@example.com")
        event = Event(name="Mine Event", owner=owner).save()
        Membership(user=owner, event=event, role=Membership.ROLE_OWNER).save()
        Membership(user=member, event=event, role=Membership.ROLE_MEMBER).save()

        Photo(
            event=event,
            uploader=owner,
            original_file="o.jpg",
            thumbnail="o_t.jpg",
            medium_preview="o_m.jpg",
            width=100,
            height=100,
            taken_at=datetime.utcnow(),
            size_bytes=100,
        ).save()
        p_mem = Photo(
            event=event,
            uploader=member,
            original_file="m.jpg",
            thumbnail="m_t.jpg",
            medium_preview="m_m.jpg",
            width=100,
            height=100,
            taken_at=datetime.utcnow(),
            size_bytes=100,
        ).save()

        client_member = auth_client_for(member)
        res = client_member.get(f"/api/events/{event.id}/photos/?mine=true")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["count"] == 1
        assert res.data["results"][0]["id"] == str(p_mem.id)

    def test_filter_by_favorites(self):
        owner = create_user("owner@example.com")
        event = Event(name="Fav Event", owner=owner).save()
        Membership(user=owner, event=event, role=Membership.ROLE_OWNER).save()

        p1 = Photo(
            event=event,
            uploader=owner,
            original_file="f1.jpg",
            thumbnail="f1_t.jpg",
            medium_preview="f1_m.jpg",
            width=100,
            height=100,
            taken_at=datetime.utcnow(),
            size_bytes=100,
        ).save()
        p2 = Photo(
            event=event,
            uploader=owner,
            original_file="f2.jpg",
            thumbnail="f2_t.jpg",
            medium_preview="f2_m.jpg",
            width=100,
            height=100,
            taken_at=datetime.utcnow(),
            size_bytes=100,
        ).save()

        # Like only p1
        Like(user=owner, photo=p1).save()

        client = auth_client_for(owner)
        res = client.get(f"/api/events/{event.id}/photos/?favorites=true")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["count"] == 1
        assert res.data["results"][0]["id"] == str(p1.id)
        assert res.data["results"][0]["liked_by_me"] is True

    def test_filter_by_day(self):
        owner = create_user("owner@example.com")
        event = Event(name="Day Event", owner=owner).save()
        Membership(user=owner, event=event, role=Membership.ROLE_OWNER).save()

        # Photo on Nov 20, 2026
        p_day1 = Photo(
            event=event,
            uploader=owner,
            original_file="d1.jpg",
            thumbnail="d1_t.jpg",
            medium_preview="d1_m.jpg",
            width=100,
            height=100,
            taken_at=datetime(2026, 11, 20, 14, 0, 0),
            size_bytes=100,
        ).save()
        # Photo on Nov 21, 2026
        Photo(
            event=event,
            uploader=owner,
            original_file="d2.jpg",
            thumbnail="d2_t.jpg",
            medium_preview="d2_m.jpg",
            width=100,
            height=100,
            taken_at=datetime(2026, 11, 21, 10, 0, 0),
            size_bytes=100,
        ).save()

        client = auth_client_for(owner)
        res = client.get(f"/api/events/{event.id}/photos/?day=2026-11-20")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["count"] == 1
        assert res.data["results"][0]["id"] == str(p_day1.id)


class TestPhotoLiking:
    def test_like_and_unlike_photo(self):
        owner = create_user("owner@example.com")
        member = create_user("member@example.com")
        event = Event(name="Like Event", owner=owner).save()
        Membership(user=owner, event=event, role=Membership.ROLE_OWNER).save()
        Membership(user=member, event=event, role=Membership.ROLE_MEMBER).save()

        photo = Photo(
            event=event,
            uploader=owner,
            original_file="p.jpg",
            thumbnail="p_t.jpg",
            medium_preview="p_m.jpg",
            width=100,
            height=100,
            taken_at=datetime.utcnow(),
            size_bytes=100,
        ).save()

        client_member = auth_client_for(member)

        # 1. Like photo
        like_res = client_member.post(f"/api/photos/{photo.id}/like/")
        assert like_res.status_code == status.HTTP_200_OK
        assert like_res.data["like_count"] == 1
        assert like_res.data["liked_by_me"] is True
        assert Like.objects(user=member, photo=photo).count() == 1

        # 2. Like again (should remain 1, idempotent)
        like_again_res = client_member.post(f"/api/photos/{photo.id}/like/")
        assert like_again_res.status_code == status.HTTP_200_OK
        assert like_again_res.data["like_count"] == 1
        assert Like.objects(user=member, photo=photo).count() == 1

        # 3. Check in photo list: like_count is 1 and liked_by_me is True
        list_res = client_member.get(f"/api/events/{event.id}/photos/")
        assert list_res.data["results"][0]["like_count"] == 1
        assert list_res.data["results"][0]["liked_by_me"] is True

        # 4. Unlike photo
        unlike_res = client_member.delete(f"/api/photos/{photo.id}/like/")
        assert unlike_res.status_code == status.HTTP_200_OK
        assert unlike_res.data["like_count"] == 0
        assert unlike_res.data["liked_by_me"] is False
        assert Like.objects(user=member, photo=photo).count() == 0

    def test_non_member_cannot_like_photo(self):
        owner = create_user("owner@example.com")
        event = Event(name="Event", owner=owner).save()
        Membership(user=owner, event=event, role=Membership.ROLE_OWNER).save()

        photo = Photo(
            event=event,
            uploader=owner,
            original_file="p.jpg",
            thumbnail="p_t.jpg",
            medium_preview="p_m.jpg",
            width=100,
            height=100,
            taken_at=datetime.utcnow(),
            size_bytes=100,
        ).save()

        outsider = create_user("outsider@example.com")
        client_outsider = auth_client_for(outsider)

        res = client_outsider.post(f"/api/photos/{photo.id}/like/")
        assert res.status_code == status.HTTP_403_FORBIDDEN


class TestPhotoDeletion:
    def test_uploader_can_delete_photo(self):
        owner = create_user("owner@example.com")
        member = create_user("member@example.com")
        event = Event(name="Event", owner=owner).save()
        Membership(user=owner, event=event, role=Membership.ROLE_OWNER).save()
        Membership(user=member, event=event, role=Membership.ROLE_MEMBER).save()

        photo = Photo(
            event=event,
            uploader=member,
            original_file="p.jpg",
            thumbnail="p_t.jpg",
            medium_preview="p_m.jpg",
            width=100,
            height=100,
            taken_at=datetime.utcnow(),
            size_bytes=100,
        ).save()

        client_member = auth_client_for(member)
        del_res = client_member.delete(f"/api/photos/{photo.id}/")
        assert del_res.status_code == status.HTTP_204_NO_CONTENT
        assert Photo.objects(id=photo.id).first() is None

    def test_event_owner_can_delete_photo_uploaded_by_another_member(self):
        owner = create_user("owner@example.com")
        member = create_user("member@example.com")
        event = Event(name="Event", owner=owner).save()
        Membership(user=owner, event=event, role=Membership.ROLE_OWNER).save()
        Membership(user=member, event=event, role=Membership.ROLE_MEMBER).save()

        photo = Photo(
            event=event,
            uploader=member,
            original_file="p.jpg",
            thumbnail="p_t.jpg",
            medium_preview="p_m.jpg",
            width=100,
            height=100,
            taken_at=datetime.utcnow(),
            size_bytes=100,
        ).save()

        client_owner = auth_client_for(owner)
        del_res = client_owner.delete(f"/api/photos/{photo.id}/")
        assert del_res.status_code == status.HTTP_204_NO_CONTENT
        assert Photo.objects(id=photo.id).first() is None

    def test_regular_member_cannot_delete_other_member_photo(self):
        owner = create_user("owner@example.com")
        member_a = create_user("a@example.com")
        member_b = create_user("b@example.com")
        event = Event(name="Event", owner=owner).save()
        Membership(user=owner, event=event, role=Membership.ROLE_OWNER).save()
        Membership(user=member_a, event=event, role=Membership.ROLE_MEMBER).save()
        Membership(user=member_b, event=event, role=Membership.ROLE_MEMBER).save()

        photo_a = Photo(
            event=event,
            uploader=member_a,
            original_file="pa.jpg",
            thumbnail="pa_t.jpg",
            medium_preview="pa_m.jpg",
            width=100,
            height=100,
            taken_at=datetime.utcnow(),
            size_bytes=100,
        ).save()

        client_b = auth_client_for(member_b)
        del_res = client_b.delete(f"/api/photos/{photo_a.id}/")
        assert del_res.status_code == status.HTTP_403_FORBIDDEN
        assert Photo.objects(id=photo_a.id).first() is not None


class TestEventDeletionCleanup:
    def test_owner_deletion_removes_event_photos_comments_and_media(self):
        owner = create_user("owner@example.com")
        event = Event(name="Delete this event", owner=owner).save()
        Membership(user=owner, event=event, role=Membership.ROLE_OWNER).save()

        relative_paths = [
            f"photos/{event.id}/original/photo.jpg",
            f"photos/{event.id}/thumbnail/photo.jpg",
            f"photos/{event.id}/medium/photo.jpg",
            f"voice-notes/{event.id}/photo.weba",
            f"voice-notes/{event.id}/comment.weba",
        ]
        for relative_path in relative_paths:
            file_path = os.path.join(settings.MEDIA_ROOT, relative_path)
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            with open(file_path, "wb") as saved_file:
                saved_file.write(b"event media")

        photo = Photo(
            event=event,
            uploader=owner,
            original_file=relative_paths[0],
            thumbnail=relative_paths[1],
            medium_preview=relative_paths[2],
            voice_note=relative_paths[3],
            width=100,
            height=100,
            taken_at=datetime.utcnow(),
            size_bytes=100,
        ).save()
        Like(user=owner, photo=photo).save()
        PhotoComment(
            photo=photo,
            user=owner,
            text="A comment",
            voice_file=relative_paths[4],
        ).save()

        response = auth_client_for(owner).delete(f"/api/events/{event.id}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert Event.objects(id=event.id).first() is None
        assert Membership.objects(event=event).count() == 0
        assert Photo.objects(event=event).count() == 0
        assert PhotoComment.objects(photo=photo).count() == 0
        assert Like.objects(photo=photo).count() == 0
        assert all(not os.path.exists(os.path.join(settings.MEDIA_ROOT, path)) for path in relative_paths)
