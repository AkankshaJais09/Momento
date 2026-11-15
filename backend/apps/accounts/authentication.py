from bson import ObjectId
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from rest_framework_simplejwt.settings import api_settings
from apps.accounts.models import User


class MongoJWTAuthentication(JWTAuthentication):
    """JWT authentication backend adapted for MongoEngine User document."""

    def get_user(self, validated_token):
        try:
            user_id = validated_token[api_settings.USER_ID_CLAIM]
        except KeyError:
            raise InvalidToken("Token contained no recognizable user identification.")

        try:
            if ObjectId.is_valid(user_id):
                user = User.objects(id=ObjectId(user_id)).first()
            else:
                user = User.objects(id=user_id).first()
        except Exception:
            raise AuthenticationFailed("User not found.", code="user_not_found")

        if user is None:
            raise AuthenticationFailed("User not found.", code="user_not_found")

        if not user.is_active:
            raise AuthenticationFailed("User is inactive.", code="user_inactive")

        return user
