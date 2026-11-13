"""
Unit tests for the events app.
MongoEngine documents are tested with mongomock so no live MongoDB is required.
"""
import pytest
from unittest.mock import patch, MagicMock
from apps.events.models import Event


class TestEventInviteToken:
    def test_generate_invite_token_is_unique(self):
        tokens = {Event.generate_invite_token() for _ in range(100)}
        assert len(tokens) == 100

    def test_generate_invite_token_length(self):
        token = Event.generate_invite_token()
        # token_urlsafe(16) produces a 22-character base64url string
        assert len(token) >= 20


class TestEventModel:
    def test_event_has_required_fields(self):
        event = Event.__new__(Event)
        # Confirm field names are defined on the class
        assert "name" in Event._fields
        assert "invite_token" in Event._fields
        assert "created_at" in Event._fields
        assert "updated_at" in Event._fields

    def test_invite_token_is_unique_field(self):
        field = Event._fields["invite_token"]
        assert field.unique is True
