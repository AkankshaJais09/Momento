from django.urls import path
from .views import EventListCreateView, EventDetailView, EventByTokenView

urlpatterns = [
    path("", EventListCreateView.as_view(), name="event-list-create"),
    path("<str:pk>/", EventDetailView.as_view(), name="event-detail"),
    path("invite/<str:token>/", EventByTokenView.as_view(), name="event-by-token"),
]
