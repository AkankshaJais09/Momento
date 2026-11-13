from django.urls import path
from .views import PhotoListUploadView, PhotoDetailView

urlpatterns = [
    path("<str:event_id>/", PhotoListUploadView.as_view(), name="photo-list-upload"),
    path("<str:event_id>/<str:pk>/", PhotoDetailView.as_view(), name="photo-detail"),
]
