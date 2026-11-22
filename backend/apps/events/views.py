# Event views for managing group events, memberships, and invite links.
# Only members can view events, and only the owner can edit, delete, or regenerate codes.

import os
from collections import defaultdict
from django.conf import settings
from django.utils import timezone
from bson import ObjectId
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.events.models import Event, Membership
from apps.events.permissions import IsEventMember, IsEventOwner
from apps.events.serializers import (
    EventCreateUpdateSerializer,
    EventSerializer,
    InvitePreviewSerializer,
    JoinEventSerializer,
)
from apps.photos.models import Photo, PhotoComment
from apps.photos import storage

def get_event_or_none(pk):
    """Retrieve an event by string ID or ObjectId."""
    try:
        if ObjectId.is_valid(pk):
            return Event.objects(id=ObjectId(pk)).first()
        return Event.objects(id=pk).first()
    except Exception:
        return None

def delete_media_file(relative_path):
    storage.delete_file(relative_path)


# List and create view: Lists events where the logged-in user is a member, or creates a new event.
class EventListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_memberships = list(
            Membership.objects(user=request.user)
            .only("event", "role")
            .as_pymongo()
        )
        event_ids = [membership["event"] for membership in user_memberships if membership.get("event")]
        events = list(Event.objects(id__in=event_ids))
        if not events:
            return Response([], status=status.HTTP_200_OK)

        member_counts = defaultdict(int)
        for membership in Membership.objects(event__in=events).only("event").as_pymongo():
            member_counts[str(membership["event"])] += 1

        my_roles = {
            str(membership["event"]): membership["role"]
            for membership in user_memberships
            if membership.get("event")
        }
        serializer = EventSerializer(
            events,
            many=True,
            context={
                "request": request,
                "member_counts": member_counts,
                "my_roles": my_roles,
            },
        )

        visible_event_ids = [
            event.id
            for event in events
            if not (
                event.capsule_release_at
                and event.capsule_release_at > timezone.now()
                and str(event.owner.id) != str(request.user.id)
            )
        ]
        photo_summaries = Photo._get_collection().aggregate([
            {"$match": {"event": {"$in": visible_event_ids}}},
            {"$sort": {"event": 1, "taken_at": -1, "created_at": -1}},
            {
                "$group": {
                    "_id": "$event",
                    "photo_count": {"$sum": 1},
                    "cover_path": {"$first": "$medium_preview"},
                },
            },
        ])
        summaries = {
            str(summary["_id"]): {
                "photo_count": summary["photo_count"],
                "cover_photo_url": storage.public_url(summary["cover_path"]),
            }
            for summary in photo_summaries
        }
        data = serializer.data
        for event_data in data:
            summary = summaries.get(event_data["id"], {})
            event_data["photo_count"] = summary.get("photo_count", 0)
            event_data["cover_photo_url"] = summary.get("cover_photo_url", "")
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        # Create a new event and automatically make the creator its owner
        serializer = EventCreateUpdateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        event = serializer.save()
        return Response(
            EventSerializer(event, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


# Detail view: Lets members view an event, and allows the owner to update or delete it.
class EventDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        # Only owners can change or delete, members can view
        if self.request.method in ["PATCH", "PUT", "DELETE"]:
            return [IsAuthenticated(), IsEventOwner()]
        return [IsAuthenticated(), IsEventMember()]

    def get(self, request, pk):
        event = get_event_or_none(pk)
        if event is None:
            return Response({"detail": "Event not found."}, status=status.HTTP_404_NOT_FOUND)

        self.check_object_permissions(request, event)
        return Response(
            EventSerializer(event, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    def patch(self, request, pk):
        event = get_event_or_none(pk)
        if event is None:
            return Response({"detail": "Event not found."}, status=status.HTTP_404_NOT_FOUND)

        self.check_object_permissions(request, event)
        serializer = EventCreateUpdateSerializer(
            event,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(
            EventSerializer(updated, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    def put(self, request, pk):
        return self.patch(request, pk)

    def delete(self, request, pk):
        event = get_event_or_none(pk)
        if event is None:
            return Response({"detail": "Event not found."}, status=status.HTTP_404_NOT_FOUND)

        self.check_object_permissions(request, event)
        for photo in list(Photo.objects(event=event)):
            for comment in list(PhotoComment.objects(photo=photo)):
                delete_media_file(comment.voice_file)
                comment.delete()
            for relative_path in (
                photo.original_file,
                photo.thumbnail,
                photo.medium_preview,
                photo.voice_note,
            ):
                delete_media_file(relative_path)
            photo.delete()

        Membership.objects(event=event).delete()
        event.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# Join view: Lets any logged-in user join an event using a valid invite code.
class JoinEventView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = JoinEventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        code = serializer.validated_data["invite_code"]

        event = Event.objects(invite_code=code).first()
        if event is None:
            return Response({"detail": "Invalid invite code."}, status=status.HTTP_404_NOT_FOUND)

        existing = Membership.objects(user=request.user, event=event).first()
        if existing:
            return Response(
                {
                    "detail": "You are already a member of this event.",
                    "event": EventSerializer(event, context={"request": request}).data,
                },
                status=status.HTTP_200_OK,
            )

        Membership(
            user=request.user,
            event=event,
            role=Membership.ROLE_MEMBER,
        ).save()

        return Response(
            {
                "detail": "Successfully joined event.",
                "event": EventSerializer(event, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )


# Invite preview view: Public preview returning only the event name and member count.
class EventInvitePreviewView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, code):
        event = Event.objects(invite_code=code).first()
        if event is None:
            return Response({"detail": "Invalid invite code."}, status=status.HTTP_404_NOT_FOUND)

        member_count = Membership.objects(event=event).count()
        payload = {
            "name": event.name,
            "member_count": member_count,
        }
        serializer = InvitePreviewSerializer(payload)
        return Response(serializer.data, status=status.HTTP_200_OK)


# Leave view: Lets a regular member leave an event (owner cannot leave without deleting).
class LeaveEventView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        event = get_event_or_none(pk)
        if event is None:
            return Response({"detail": "Event not found."}, status=status.HTTP_404_NOT_FOUND)

        membership = Membership.objects(user=request.user, event=event).first()
        if not membership:
            return Response(
                {"detail": "You are not a member of this event."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if membership.role == Membership.ROLE_OWNER:
            return Response(
                {"detail": "The event owner cannot leave the event. Delete the event instead."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        membership.delete()
        return Response({"detail": "Successfully left the event."}, status=status.HTTP_200_OK)


# Regenerate invite code view: Generates a new invite code so old links stop working.
class RegenerateInviteCodeView(APIView):
    permission_classes = [IsAuthenticated, IsEventOwner]

    def post(self, request, pk):
        event = get_event_or_none(pk)
        if event is None:
            return Response({"detail": "Event not found."}, status=status.HTTP_404_NOT_FOUND)

        self.check_object_permissions(request, event)

        event.invite_code = Event.generate_invite_code()
        event.save()

        return Response(
            {
                "detail": "Invite code regenerated successfully.",
                "invite_code": event.invite_code,
                "event": EventSerializer(event, context={"request": request}).data,
            },
            status=status.HTTP_200_OK,
        )


class EventContributorsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        event = get_event_or_none(pk)
        if event is None:
            return Response({"detail": "Event not found."}, status=status.HTTP_404_NOT_FOUND)
        if str(event.owner.id) != str(request.user.id):
            return Response(
                {"detail": "Only the host can view contributors."},
                status=status.HTTP_403_FORBIDDEN,
            )

        contributions = {}
        photo_rows = Photo._get_collection().aggregate([
            {"$match": {"event": event.id}},
            {
                "$group": {
                    "_id": "$uploader",
                    "photo_count": {"$sum": 1},
                    "voice_note_count": {
                        "$sum": {
                            "$cond": [
                                {"$and": [{"$ne": ["$voice_note", None]}, {"$ne": ["$voice_note", ""]}]},
                                1,
                                0,
                            ],
                        },
                    },
                },
            },
        ])
        for row in photo_rows:
            user_id = str(row["_id"])
            contributions[user_id] = {
                "user_id": user_id,
                "photo_count": row["photo_count"],
                "voice_note_count": row["voice_note_count"],
            }

        comment_voice_rows = Photo._get_collection().aggregate([
            {"$match": {"event": event.id}},
            {
                "$lookup": {
                    "from": PhotoComment._get_collection().name,
                    "localField": "_id",
                    "foreignField": "photo",
                    "as": "comments",
                },
            },
            {"$unwind": "$comments"},
            {"$match": {"comments.voice_file": {"$nin": [None, ""]}}},
            {
                "$group": {
                    "_id": "$comments.user",
                    "voice_note_count": {"$sum": 1},
                },
            },
        ])
        for row in comment_voice_rows:
            user_id = str(row["_id"])
            contributions.setdefault(
                user_id,
                {"user_id": user_id, "photo_count": 0, "voice_note_count": 0},
            )
            contributions[user_id]["voice_note_count"] += row["voice_note_count"]

        users = User.objects(id__in=[ObjectId(user_id) for user_id in contributions])
        for user in users:
            contribution = contributions[str(user.id)]
            contribution["name"] = user.display_name
            contribution["email"] = user.email

        return Response(list(contributions.values()), status=status.HTTP_200_OK)
