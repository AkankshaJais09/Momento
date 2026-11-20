from datetime import datetime, timedelta
import io
import os
import zipfile
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
from apps.photos.models import Photo, Like


@pytest.fixture(autouse=True)
def setup_test_db(tmp_path):
    """Isolate tests in mock database, temporary media directory, and reset cache."""
    mongoengine.disconnect()
    mongoengine.connect("test_photos_db", host="localhost", mongo_client_class=mongomock.MongoClient)
    Photo.drop_collection()
    Like.drop_collection()
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


class TestPhotoUploadSuccess:
    def test_valid_photo_upload_single_file(self):
        owner = create_user("owner@example.com")
        event = Event(name="Vacation", owner=owner).save()
        Membership(user=owner, event=event, role=Membership.ROLE_OWNER).save()

        client = auth_client_for(owner)
        img_file = make_image_file("vacation.jpg", "JPEG", size=(800, 600))
        raw_bytes = img_file.read()
        img_file.seek(0)

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
        assert photo_data["size_bytes"] == len(raw_bytes)
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

        # Verify untouched original file exists in local media folder
        orig_full_path = os.path.join(settings.MEDIA_ROOT, photo.original_file)
        assert os.path.exists(orig_full_path)
        with open(orig_full_path, "rb") as f:
            assert f.read() == raw_bytes

        # Verify thumbnail and medium preview files exist on disk
        thumb_full_path = os.path.join(settings.MEDIA_ROOT, photo.thumbnail)
        medium_full_path = os.path.join(settings.MEDIA_ROOT, photo.medium_preview)
        assert os.path.exists(thumb_full_path)
        assert os.path.exists(medium_full_path)

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
        assert "not a valid or supported image file" in str(response.data).lower() or "supported formats" in str(response.data).lower()

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
        assert "not a valid or supported image file" in str(response.data).lower()

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


class TestSinglePhotoDownload:
    # Tests for GET /api/photos/<id>/download/ returning the original file.

    def _create_photo_with_file(self, event, uploader, filename="test_photo.jpg"):
        """Helper: create a photo record and write a real file to the temp media directory."""
        file_content = b"fake-jpeg-bytes-for-testing"
        rel_dir = f"photos/{event.id}/original"
        abs_dir = os.path.join(settings.MEDIA_ROOT, rel_dir)
        os.makedirs(abs_dir, exist_ok=True)
        rel_path = f"{rel_dir}/{filename}"
        abs_path = os.path.join(settings.MEDIA_ROOT, rel_path)
        with open(abs_path, "wb") as f:
            f.write(file_content)

        photo = Photo(
            event=event,
            uploader=uploader,
            original_file=rel_path,
            thumbnail=f"photos/{event.id}/thumbnail/{filename}",
            medium_preview=f"photos/{event.id}/medium/{filename}",
            width=100,
            height=100,
            taken_at=datetime.utcnow(),
            size_bytes=len(file_content),
            original_filename=filename,
        ).save()
        return photo, file_content

    def test_member_can_download_original_photo(self):
        owner = create_user("owner@example.com")
        member = create_user("member@example.com")
        event = Event(name="Download Event", owner=owner).save()
        Membership(user=owner, event=event, role=Membership.ROLE_OWNER).save()
        Membership(user=member, event=event, role=Membership.ROLE_MEMBER).save()

        photo, file_content = self._create_photo_with_file(event, owner)
        client = auth_client_for(member)

        res = client.get(f"/api/photos/{photo.id}/download/")
        assert res.status_code == status.HTTP_200_OK
        # FileResponse streams content, read it all
        downloaded = b"".join(res.streaming_content)
        assert downloaded == file_content

    def test_non_member_cannot_download_photo(self):
        owner = create_user("owner@example.com")
        outsider = create_user("outsider@example.com")
        event = Event(name="Event", owner=owner).save()
        Membership(user=owner, event=event, role=Membership.ROLE_OWNER).save()

        photo, _ = self._create_photo_with_file(event, owner)
        client = auth_client_for(outsider)

        res = client.get(f"/api/photos/{photo.id}/download/")
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_download_nonexistent_photo_returns_404(self):
        owner = create_user("owner@example.com")
        client = auth_client_for(owner)
        res = client.get("/api/photos/000000000000000000000000/download/")
        assert res.status_code == status.HTTP_404_NOT_FOUND

    def test_unauthenticated_user_cannot_download(self):
        client = APIClient()
        res = client.get("/api/photos/000000000000000000000000/download/")
        assert res.status_code == status.HTTP_401_UNAUTHORIZED


class TestZipDownload:
    # Tests for POST /api/events/<id>/download/ returning a zip of selected photos.

    def _create_photo_with_file(self, event, uploader, filename="photo.jpg", content=None):
        """Helper: create a photo record and write a real file to the temp media directory."""
        file_content = content or f"bytes-for-{filename}".encode()
        rel_dir = f"photos/{event.id}/original"
        abs_dir = os.path.join(settings.MEDIA_ROOT, rel_dir)
        os.makedirs(abs_dir, exist_ok=True)
        rel_path = f"{rel_dir}/{filename}"
        abs_path = os.path.join(settings.MEDIA_ROOT, rel_path)
        with open(abs_path, "wb") as f:
            f.write(file_content)

        photo = Photo(
            event=event,
            uploader=uploader,
            original_file=rel_path,
            thumbnail=f"photos/{event.id}/thumbnail/{filename}",
            medium_preview=f"photos/{event.id}/medium/{filename}",
            width=100,
            height=100,
            taken_at=datetime.utcnow(),
            size_bytes=len(file_content),
            original_filename=filename,
        ).save()
        return photo, file_content

    def test_member_can_download_zip_of_selected_photos(self):
        owner = create_user("owner@example.com")
        member = create_user("member@example.com")
        event = Event(name="Zip Event", owner=owner).save()
        Membership(user=owner, event=event, role=Membership.ROLE_OWNER).save()
        Membership(user=member, event=event, role=Membership.ROLE_MEMBER).save()

        p1, content1 = self._create_photo_with_file(event, owner, "a.jpg", b"aaa-content")
        p2, content2 = self._create_photo_with_file(event, owner, "b.jpg", b"bbb-content")

        client = auth_client_for(member)
        res = client.post(
            f"/api/events/{event.id}/download/",
            {"photo_ids": [str(p1.id), str(p2.id)]},
            format="json",
        )
        assert res.status_code == status.HTTP_200_OK
        assert res["Content-Type"] == "application/zip"

        # Verify the zip contains the two files with correct content
        zip_buf = io.BytesIO(res.content)
        with zipfile.ZipFile(zip_buf, "r") as zf:
            names = zf.namelist()
            assert len(names) == 2
            assert "a.jpg" in names
            assert "b.jpg" in names
            assert zf.read("a.jpg") == content1
            assert zf.read("b.jpg") == content2

    def test_zip_rejects_more_than_50_photos(self):
        owner = create_user("owner@example.com")
        event = Event(name="Big Event", owner=owner).save()
        Membership(user=owner, event=event, role=Membership.ROLE_OWNER).save()

        client = auth_client_for(owner)
        # Send 51 fake IDs (they do not need to exist, the limit check comes first)
        fake_ids = [f"aaaa{str(i).zfill(20)}" for i in range(51)]
        res = client.post(
            f"/api/events/{event.id}/download/",
            {"photo_ids": fake_ids},
            format="json",
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "50" in str(res.data["detail"])

    def test_non_member_cannot_download_zip(self):
        owner = create_user("owner@example.com")
        outsider = create_user("outsider@example.com")
        event = Event(name="Event", owner=owner).save()
        Membership(user=owner, event=event, role=Membership.ROLE_OWNER).save()

        p1, _ = self._create_photo_with_file(event, owner, "x.jpg")
        client = auth_client_for(outsider)

        res = client.post(
            f"/api/events/{event.id}/download/",
            {"photo_ids": [str(p1.id)]},
            format="json",
        )
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_zip_with_no_photo_ids_returns_400(self):
        owner = create_user("owner@example.com")
        event = Event(name="Event", owner=owner).save()
        Membership(user=owner, event=event, role=Membership.ROLE_OWNER).save()

        client = auth_client_for(owner)
        res = client.post(
            f"/api/events/{event.id}/download/",
            {},
            format="json",
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_zip_with_invalid_photo_ids_returns_404(self):
        owner = create_user("owner@example.com")
        event = Event(name="Event", owner=owner).save()
        Membership(user=owner, event=event, role=Membership.ROLE_OWNER).save()

        client = auth_client_for(owner)
        res = client.post(
            f"/api/events/{event.id}/download/",
            {"photo_ids": ["000000000000000000000000"]},
            format="json",
        )
        assert res.status_code == status.HTTP_404_NOT_FOUND

    def test_unauthenticated_user_cannot_download_zip(self):
        owner = create_user("owner@example.com")
        event = Event(name="Event", owner=owner).save()
        Membership(user=owner, event=event, role=Membership.ROLE_OWNER).save()

        client = APIClient()
        res = client.post(
            f"/api/events/{event.id}/download/",
            {"photo_ids": ["000000000000000000000000"]},
            format="json",
        )
        assert res.status_code == status.HTTP_401_UNAUTHORIZED


class TestPhotoBatchDelete:
    def test_owner_batch_delete_photos(self):
        owner = create_user("owner_batch@example.com")
        event = Event(name="Batch Event", owner=owner).save()
        Membership(user=owner, event=event, role=Membership.ROLE_OWNER).save()

        p1 = Photo(
            event=event,
            uploader=owner,
            original_file="b1.jpg",
            thumbnail="b1_t.jpg",
            medium_preview="b1_m.jpg",
            width=100,
            height=100,
            taken_at=datetime.utcnow(),
            size_bytes=100,
        ).save()
        p2 = Photo(
            event=event,
            uploader=owner,
            original_file="b2.jpg",
            thumbnail="b2_t.jpg",
            medium_preview="b2_m.jpg",
            width=100,
            height=100,
            taken_at=datetime.utcnow(),
            size_bytes=100,
        ).save()

        client = auth_client_for(owner)
        res = client.post(
            f"/api/events/{event.id}/photos/batch-delete/",
            {"photo_ids": [str(p1.id), str(p2.id)]},
            format="json",
        )
        assert res.status_code == status.HTTP_200_OK
        assert res.data["deleted_count"] == 2
        assert Photo.objects(event=event).count() == 0
