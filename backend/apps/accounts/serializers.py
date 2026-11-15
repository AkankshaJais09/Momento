from bson import ObjectId
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed as DRFAuthenticationFailed
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from apps.accounts.models import User
from apps.accounts.validators import validate_email_format, validate_password_strength


class UserSerializer(serializers.Serializer):
    """Serializer for User document representation."""

    id = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    display_name = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)


class RegisterSerializer(serializers.Serializer):
    """Serializer for user registration."""

    email = serializers.CharField(required=True)
    display_name = serializers.CharField(required=True, max_length=100)
    password = serializers.CharField(required=True, write_only=True)

    def validate_email(self, value):
        cleaned_email = validate_email_format(value)
        if User.objects(email=cleaned_email).first():
            raise serializers.ValidationError("A user with this email already exists.")
        return cleaned_email

    def validate_display_name(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Display name cannot be empty.")
        return cleaned

    def validate_password(self, value):
        return validate_password_strength(value)

    def create(self, validated_data):
        user = User(
            email=validated_data["email"],
            display_name=validated_data["display_name"],
        )
        user.set_password(validated_data["password"])
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    """Serializer for user authentication."""

    email = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        email = attrs.get("email", "").strip().lower()
        password = attrs.get("password", "")

        if not email or not password:
            raise serializers.ValidationError("Both email and password are required.")

        user = User.objects(email=email).first()
        if user is None or not user.check_password(password):
            raise DRFAuthenticationFailed("Invalid email or password.")

        if not user.is_active:
            raise DRFAuthenticationFailed("This account is inactive.")

        self.user = user
        return attrs


class CustomTokenRefreshSerializer(TokenRefreshSerializer):
    """Refresh token serializer compatible with MongoEngine User."""

    def validate(self, attrs):
        refresh = self.token_class(attrs["refresh"])
        user_id = refresh.payload.get(api_settings.USER_ID_CLAIM, None)

        if user_id:
            try:
                if ObjectId.is_valid(user_id):
                    user = User.objects(id=ObjectId(user_id)).first()
                else:
                    user = User.objects(id=user_id).first()
            except Exception:
                user = None

            if user is None or not user.is_active:
                raise AuthenticationFailed(
                    "No active account found for the given token.",
                    "no_active_account",
                )

        data = {"access": str(refresh.access_token)}

        if api_settings.ROTATE_REFRESH_TOKENS:
            refresh.set_jti()
            refresh.set_exp()
            refresh.set_iat()
            data["refresh"] = str(refresh)

        return data


class UpdateUserSerializer(serializers.Serializer):
    """Serializer for updating user profile fields."""

    display_name = serializers.CharField(required=False, max_length=100)

    def validate_display_name(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Display name cannot be empty.")
        return cleaned

    def update(self, instance, validated_data):
        if "display_name" in validated_data:
            instance.display_name = validated_data["display_name"]
        instance.save()
        return instance
