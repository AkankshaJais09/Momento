from django.urls import include, re_path
from apps.events.views import (
    EventListCreateView,
    EventDetailView,
    JoinEventView,
    EventInvitePreviewView,
    EventContributorsView,
    LeaveEventView,
    RegenerateInviteCodeView,
    EventMembersView,
    EventMemberDetailView,
    EventStatsView,
)
from apps.photos.views import EventPhotosZipDownloadView

urlpatterns = [
    re_path(r"^join/?$", JoinEventView.as_view(), name="event-join"),
    re_path(r"^invite/(?P<code>[^/]+)/?$", EventInvitePreviewView.as_view(), name="event-invite-preview"),
    re_path(r"^(?P<pk>[^/]+)/download-zip/?$", EventPhotosZipDownloadView.as_view(), name="event-download-zip"),
    re_path(r"^(?P<event_id>[^/]+)/photos/", include("apps.photos.urls")),
    re_path(r"^(?P<pk>[^/]+)/download/?$", EventPhotosZipDownloadView.as_view(), name="event-zip-download"),
    re_path(r"^(?P<pk>[^/]+)/leave/?$", LeaveEventView.as_view(), name="event-leave"),
    re_path(r"^(?P<pk>[^/]+)/regenerate-invite-code/?$", RegenerateInviteCodeView.as_view(), name="event-regenerate-invite-code"),
<<<<<<< HEAD
    re_path(r"^(?P<pk>[^/]+)/contributors/?$", EventContributorsView.as_view(), name="event-contributors"),
=======
    re_path(r"^(?P<pk>[^/]+)/members/(?P<user_id>[^/]+)/?$", EventMemberDetailView.as_view(), name="event-member-detail"),
    re_path(r"^(?P<pk>[^/]+)/members/?$", EventMembersView.as_view(), name="event-members"),
    re_path(r"^(?P<pk>[^/]+)/stats/?$", EventStatsView.as_view(), name="event-stats"),
>>>>>>> 898b826f7d4c2eb9d89ffa11785bb347e39fe93f
    re_path(r"^(?P<pk>[^/]+)/?$", EventDetailView.as_view(), name="event-detail"),
    re_path(r"^$", EventListCreateView.as_view(), name="event-list-create"),
]
