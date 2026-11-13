from django.urls import path, include

urlpatterns = [
    path("api/events/", include("apps.events.urls")),
    path("api/photos/", include("apps.photos.urls")),
]
