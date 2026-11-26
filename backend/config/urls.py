from django.conf import settings
from django.urls import path, include, re_path
from django.views.decorators.cache import cache_control
from django.views.static import serve

urlpatterns = [
    path("api/auth/", include("apps.accounts.urls")),
    path("api/events/", include("apps.events.urls")),
    path("api/photos/", include("apps.photos.urls")),
]

if settings.DEBUG:
    media_path = settings.MEDIA_URL.lstrip("/")
    urlpatterns += [
        re_path(
            rf"^{media_path}(?P<path>.*)$",
            cache_control(max_age=86400)(serve),
            {"document_root": settings.MEDIA_ROOT},
        )
    ]
