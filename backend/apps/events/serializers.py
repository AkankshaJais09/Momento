from rest_framework import serializers
from django.utils import timezone
from apps.events.models import Event, Membership


class EventSerializer(serializers.Serializer):
    """Detailed representation of an event."""

    id = serializers.CharField(source="pk", read_only=True)
    name = serializers.CharField(max_length=200)
    description = serializers.CharField(max_length=1000, required=False, allow_blank=True, default="")
    start_date = serializers.DateTimeField(required=False, allow_null=True, default=None)
    end_date = serializers.DateTimeField(required=False, allow_null=True, default=None)
    cover_photo = serializers.CharField(required=False, allow_null=True, allow_blank=True, default=None)
    wall_style = serializers.ChoiceField(choices=Event.WALL_STYLES, read_only=True)
    wall_color = serializers.ChoiceField(choices=Event.WALL_COLORS, read_only=True)
    time_capsule = serializers.ChoiceField(choices=Event.TIME_CAPSULES, read_only=True)
    capsule_release_at = serializers.DateTimeField(read_only=True, allow_null=True)
    capsule_locked = serializers.SerializerMethodField()
    voice_notes_enabled = serializers.BooleanField(read_only=True)
    uploads_closed = serializers.BooleanField(read_only=True)
    owner = serializers.SerializerMethodField()
    invite_code = serializers.CharField(read_only=True)
    member_count = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def get_owner(self, obj):
        if not obj.owner:
            return None
        owner = {
            "id": str(obj.owner.id),
            "display_name": getattr(obj.owner, "display_name", ""),
        }
        request = self.context.get("request")
        if (
            request
            and getattr(request, "user", None)
            and request.user.is_authenticated
            and str(request.user.id) == str(obj.owner.id)
        ):
            owner["email"] = obj.owner.email
        return owner

    def get_capsule_locked(self, obj):
        release_at = obj.capsule_release_at
        return bool(release_at and release_at > timezone.now())

    def get_member_count(self, obj):
        counts = self.context.get("member_counts")
        if counts is not None:
            return counts.get(str(obj.id), 0)
        return Membership.objects(event=obj).count()

    def get_my_role(self, obj):
        roles = self.context.get("my_roles")
        if roles is not None:
            return roles.get(str(obj.id))
        request = self.context.get("request")
        if request and getattr(request, "user", None) and request.user.is_authenticated:
            membership = Membership.objects(user=request.user, event=obj).first()
            return membership.role if membership else None
        return None

    def validate(self, attrs):
        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")
        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({"end_date": "End date cannot be earlier than start date."})
        return attrs


class EventCreateUpdateSerializer(serializers.Serializer):
    """Serializer used for creating and updating events."""

    name = serializers.CharField(max_length=200, required=True)
    description = serializers.CharField(max_length=1000, required=False, allow_blank=True, default="")
    start_date = serializers.DateTimeField(required=False, allow_null=True, default=None)
    end_date = serializers.DateTimeField(required=False, allow_null=True, default=None)
    cover_photo = serializers.CharField(required=False, allow_null=True, allow_blank=True, default=None)
    wall_style = serializers.ChoiceField(choices=Event.WALL_STYLES, required=False)
    wall_color = serializers.ChoiceField(choices=Event.WALL_COLORS, required=False)
    time_capsule = serializers.ChoiceField(choices=Event.TIME_CAPSULES, required=False)
    voice_notes_enabled = serializers.BooleanField(required=False)
    uploads_closed = serializers.BooleanField(required=False)

    def validate(self, attrs):
        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")
        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({"end_date": "End date cannot be earlier than start date."})
        return attrs

    def create(self, validated_data):
        user = self.context["request"].user
        event = Event(
            name=validated_data["name"],
            description=validated_data.get("description", ""),
            start_date=validated_data.get("start_date"),
            end_date=validated_data.get("end_date"),
            cover_photo=validated_data.get("cover_photo"),
            wall_style=validated_data.get("wall_style", "polaroid"),
            wall_color=validated_data.get("wall_color", "#F3C9A8"),
            time_capsule=validated_data.get("time_capsule", "live"),
            voice_notes_enabled=validated_data.get("voice_notes_enabled", True),
            owner=user,
            invite_code=Event.generate_invite_code(),
        )
        event.save()

        # Automatically make creator the owner member
        Membership(
            user=user,
            event=event,
            role=Membership.ROLE_OWNER,
        ).save()

        return event

    def update(self, instance, validated_data):
        instance.name = validated_data.get("name", instance.name)
        if "description" in validated_data:
            instance.description = validated_data["description"]
        if "start_date" in validated_data:
            instance.start_date = validated_data["start_date"]
        if "end_date" in validated_data:
            instance.end_date = validated_data["end_date"]
        if "cover_photo" in validated_data:
            instance.cover_photo = validated_data["cover_photo"]
        for field in ("wall_style", "wall_color", "time_capsule", "voice_notes_enabled", "uploads_closed"):
            if field in validated_data:
                setattr(instance, field, validated_data[field])
        instance.save()
        return instance


class JoinEventSerializer(serializers.Serializer):
    """Serializer for joining an event with invite code."""

    invite_code = serializers.CharField(required=True, trim_whitespace=True)


class InvitePreviewSerializer(serializers.Serializer):
    """Public preview serializer returning event name and member count only."""

    name = serializers.CharField(read_only=True)
    member_count = serializers.IntegerField(read_only=True)


class MembershipSerializer(serializers.Serializer):
    """Serializer representing an event member."""

    id = serializers.CharField(source="pk", read_only=True)
    user_id = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    role = serializers.CharField(read_only=True)
    joined_at = serializers.DateTimeField(read_only=True)

    def get_user_id(self, obj):
        return str(obj.user.id) if obj.user else None

    def get_display_name(self, obj):
        return getattr(obj.user, "display_name", "") if obj.user else ""

    def get_email(self, obj):
        return getattr(obj.user, "email", "") if obj.user else ""


class EventStatsSerializer(serializers.Serializer):
    """Serializer for event statistics (photo count, total size, member count)."""

    total_photos = serializers.IntegerField(read_only=True)
    total_size_bytes = serializers.IntegerField(read_only=True)
    member_count = serializers.IntegerField(read_only=True)
