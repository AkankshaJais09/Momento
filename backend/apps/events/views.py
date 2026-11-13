from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from mongoengine.errors import DoesNotExist
from .models import Event
from .serializers import EventSerializer


class EventListCreateView(APIView):
    def get(self, request):
        events = Event.objects.all()
        serializer = EventSerializer(events, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = EventSerializer(data=request.data)
        if serializer.is_valid():
            event = serializer.save()
            return Response(EventSerializer(event).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EventDetailView(APIView):
    def _get_event(self, pk):
        try:
            return Event.objects.get(pk=pk)
        except (DoesNotExist, Exception):
            return None

    def get(self, request, pk):
        event = self._get_event(pk)
        if event is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(EventSerializer(event).data)

    def patch(self, request, pk):
        event = self._get_event(pk)
        if event is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = EventSerializer(event, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EventByTokenView(APIView):
    """Look up an event by its invite token (used when a guest opens the share link)."""

    def get(self, request, token):
        try:
            event = Event.objects.get(invite_token=token)
        except (DoesNotExist, Exception):
            return Response({"detail": "Invalid invite link."}, status=status.HTTP_404_NOT_FOUND)
        return Response(EventSerializer(event).data)
