# URLs for photos, likes, and photo download endpoints.
# Supports listing, uploading, deleting photos, liking, and downloading original files.

from django.urls import re_path
from apps.photos.views import (
    PhotoListUploadView,
    PhotoDetailView,
    PhotoLikeView,
    PhotoDownloadView,
<<<<<<< HEAD
    PhotoCommentsView,
=======
    PhotoBatchDeleteView,
>>>>>>> 898b826f7d4c2eb9d89ffa11785bb347e39fe93f
)

urlpatterns = [
    re_path(r"^batch-delete/?$", PhotoBatchDeleteView.as_view(), name="photo-batch-delete"),
    re_path(r"^$", PhotoListUploadView.as_view(), name="photo-list-upload"),
    re_path(r"^(?P<pk>[^/]+)/download/?$", PhotoDownloadView.as_view(), name="photo-download"),
    re_path(r"^(?P<pk>[^/]+)/like/?$", PhotoLikeView.as_view(), name="photo-like"),
    re_path(r"^(?P<pk>[^/]+)/comments/?$", PhotoCommentsView.as_view(), name="photo-comments"),
    re_path(r"^(?P<pk>[^/]+)/?$", PhotoDetailView.as_view(), name="photo-detail"),
]
