# Event and Membership models representing group albums and user participation.
# Each event has an owner, an invite code, and members with defined roles.

import mongoengine as me
import secrets
from datetime import datetime, timedelta, timezone as datetime_timezone
from django.utils import timezone as django_timezone
from apps.accounts.models import User


# Event model: Represents a shared group photo album like a trip or wedding.
class Event(me.Document):
    WALL_STYLES = ("polaroid", "film")
    TIME_CAPSULES = ("live", "midnight", "next_morning", "one_year_later")
    WALL_COLORS = (
        "#F3C9A8",
        "#C9D9C0",
        "#E8D2E6",
        "#C6D8EC",
        "#F3D58A",
        "#E7B7C8",
        "#BFE3D6",
        "#D9CBB4",
    )

    name = me.StringField(required=True, max_length=200)
    description = me.StringField(max_length=1000, default="")
    start_date = me.DateTimeField(null=True, default=None)
    end_date = me.DateTimeField(null=True, default=None)
    cover_photo = me.StringField(null=True, default=None)
    wall_style = me.StringField(choices=WALL_STYLES, default="polaroid")
    wall_color = me.StringField(choices=WALL_COLORS, default="#F3C9A8")
    time_capsule = me.StringField(choices=TIME_CAPSULES, default="live")
    voice_notes_enabled = me.BooleanField(default=True)
    uploads_closed = me.BooleanField(default=False)
    owner = me.ReferenceField(User, required=True, reverse_delete_rule=me.CASCADE)
    invite_code = me.StringField(required=True, unique=True)
    created_at = me.DateTimeField(default=datetime.utcnow)
    updated_at = me.DateTimeField(default=datetime.utcnow)

    meta = {
        "collection": "events",
        "ordering": ["-created_at"],
        "indexes": ["invite_code", "owner"],
    }

    def save(self, *args, **kwargs):
        self.updated_at = datetime.utcnow()
        if not self.invite_code:
            self.invite_code = self.generate_invite_code()
        return super().save(*args, **kwargs)

    @classmethod
    def generate_invite_code(cls):
        # Generate random unguessable token for invitations
        return secrets.token_urlsafe(16)

    @classmethod
    def generate_invite_token(cls):
        return cls.generate_invite_code()

    @property
    def invite_token(self):
        return self.invite_code

    @property
    def capsule_release_at(self):
        if self.time_capsule == "live":
            return None

        anchor = self.start_date or self.created_at
        if not anchor:
            return None
        if django_timezone.is_naive(anchor):
            anchor = django_timezone.make_aware(anchor, datetime_timezone.utc)

        if self.time_capsule == "midnight":
            return anchor.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
        if self.time_capsule == "next_morning":
            return (anchor.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)).replace(hour=8)
        try:
            return anchor.replace(year=anchor.year + 1)
        except ValueError:
            return anchor.replace(year=anchor.year + 1, day=28)


# Membership model: Links a user to an event with a role of owner or member.
class Membership(me.Document):
    ROLE_OWNER = "owner"
    ROLE_MEMBER = "member"
    ROLES = (ROLE_OWNER, ROLE_MEMBER)

    user = me.ReferenceField(User, required=True, reverse_delete_rule=me.CASCADE)
    event = me.ReferenceField(Event, required=True, reverse_delete_rule=me.CASCADE)
    role = me.StringField(required=True, choices=ROLES, default=ROLE_MEMBER)
    joined_at = me.DateTimeField(default=datetime.utcnow)

    meta = {
        "collection": "memberships",
        "ordering": ["-joined_at"],
        "indexes": [
            {"fields": ["user", "event"], "unique": True},
            "event",
            "user",
        ],
    }

    def __str__(self):
        return f"{self.user.email} in {self.event.name} ({self.role})"
