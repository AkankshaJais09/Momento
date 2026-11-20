# Event views for managing group events, memberships, and invite links.
# Only members can view events, and only the owner can edit, delete, or regenerate codes.

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
    EventStatsSerializer,
    InvitePreviewSerializer,
    JoinEventSerializer,
    MembershipSerializer,
)


def get_event_or_none(pk):
    """Retrieve an event by string ID or ObjectId."""
    try:
        if ObjectId.is_valid(pk):
            return Event.objects(id=ObjectId(pk)).first()
        return Event.objects(id=pk).first()
    except Exception:
        return None


# List and create view: Lists events where the logged-in user is a member, or creates a new event.
class EventListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Find all events the current user belongs to
        memberships = Membership.objects(user=request.user)
        event_ids = [m.event.id for m in memberships if m.event]
        events = Event.objects(id__in=event_ids)
        serializer = EventSerializer(events, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

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


# Member list view: Lists all members in an event for any event member.
class EventMembersView(APIView):
    permission_classes = [IsAuthenticated, IsEventMember]

    def get(self, request, pk):
        event = get_event_or_none(pk)
        if event is None:
            return Response({"detail": "Event not found."}, status=status.HTTP_404_NOT_FOUND)

        self.check_object_permissions(request, event)
        memberships = Membership.objects(event=event).order_by("role", "-joined_at")
        serializer = MembershipSerializer(memberships, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


# Member detail view: Allows event owner to remove a member from the event.
class EventMemberDetailView(APIView):
    permission_classes = [IsAuthenticated, IsEventOwner]

    def delete(self, request, pk, user_id):
        event = get_event_or_none(pk)
        if event is None:
            return Response({"detail": "Event not found."}, status=status.HTTP_404_NOT_FOUND)

        self.check_object_permissions(request, event)

        if str(event.owner.id) == str(user_id):
            return Response(
                {"detail": "The event owner cannot be removed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target_user = None
        if ObjectId.is_valid(user_id):
            target_user = User.objects(id=ObjectId(user_id)).first()
        if not target_user:
            target_user = User.objects(id=user_id).first()

        if not target_user:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        membership = Membership.objects(event=event, user=target_user).first()
        if not membership:
            return Response(
                {"detail": "User is not a member of this event."},
                status=status.HTTP_404_NOT_FOUND,
            )

        membership.delete()
        return Response({"detail": "Member removed successfully."}, status=status.HTTP_200_OK)


# Event stats view: Returns summary statistics for an event.
class EventStatsView(APIView):
    permission_classes = [IsAuthenticated, IsEventMember]

    def get(self, request, pk):
        from apps.photos.models import Photo

        event = get_event_or_none(pk)
        if event is None:
            return Response({"detail": "Event not found."}, status=status.HTTP_404_NOT_FOUND)

        self.check_object_permissions(request, event)

        photos = Photo.objects(event=event)
        total_photos = photos.count()
        total_size = sum(p.size_bytes or 0 for p in photos.only("size_bytes"))
        member_count = Membership.objects(event=event).count()

        data = {
            "total_photos": total_photos,
            "total_size_bytes": total_size,
            "member_count": member_count,
        }
        return Response(EventStatsSerializer(data).data, status=status.HTTP_200_OK)
