import os
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from mongoengine.errors import DoesNotExist
from .models import Photo
from .serializers import PhotoSerializer


class PhotoListUploadView(APIView):
    parser_classes = [MultiPartParser]

    def get(self, request, event_id):
        photos = Photo.objects.filter(event_id=event_id)
        serializer = PhotoSerializer(photos, many=True)
        return Response(serializer.data)

    def post(self, request, event_id):
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

        upload_dir = os.path.join(settings.MEDIA_ROOT, "photos", str(event_id))
        os.makedirs(upload_dir, exist_ok=True)

        file_path = os.path.join(upload_dir, file.name)
        with open(file_path, "wb") as dest:
            for chunk in file.chunks():
                dest.write(chunk)

        relative_path = os.path.join("photos", str(event_id), file.name)
        photo = Photo(
            event_id=str(event_id),
            file_path=relative_path,
            original_filename=file.name,
            uploader_name=request.data.get("uploader_name", ""),
        )
        photo.save()
        return Response(PhotoSerializer(photo).data, status=status.HTTP_201_CREATED)


class PhotoDetailView(APIView):
    def delete(self, request, event_id, pk):
        try:
            photo = Photo.objects.get(pk=pk, event_id=str(event_id))
        except (DoesNotExist, Exception):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        full_path = os.path.join(settings.MEDIA_ROOT, photo.file_path)
        if os.path.exists(full_path):
            os.remove(full_path)
        photo.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
