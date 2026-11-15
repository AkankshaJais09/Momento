from rest_framework.permissions import BasePermission
from apps.events.models import Membership


class IsEventMember(BasePermission):
    """
    Allows access only to authenticated members of the event.
    Non-members receive 403 Forbidden.
    """

    message = "You do not have permission to view this event."

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        return Membership.objects(user=request.user, event=obj).first() is not None


class IsEventOwner(BasePermission):
    """
    Allows modification or deletion only to the owner of the event.
    """

    message = "Only the event owner can perform this action."

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        return str(obj.owner.id) == str(request.user.id)
