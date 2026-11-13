from rest_framework import serializers
from .models import Event


class EventSerializer(serializers.Serializer):
    id = serializers.CharField(source="pk", read_only=True)
    name = serializers.CharField(max_length=200)
    description = serializers.CharField(max_length=1000, required=False, default="")
    invite_token = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def create(self, validated_data):
        event = Event(
            name=validated_data["name"],
            description=validated_data.get("description", ""),
            invite_token=Event.generate_invite_token(),
        )
        event.save()
        return event

    def update(self, instance, validated_data):
        instance.name = validated_data.get("name", instance.name)
        instance.description = validated_data.get("description", instance.description)
        instance.save()
        return instance
