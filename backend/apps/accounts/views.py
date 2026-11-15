# Authentication views for user registration, login, token refresh, and profile management.
# Uses JSON Web Tokens (JWT) for authentication.

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.authentication import MongoJWTAuthentication
from apps.accounts.serializers import (
    CustomTokenRefreshSerializer,
    LoginSerializer,
    RegisterSerializer,
    UpdateUserSerializer,
    UserSerializer,
)
from apps.accounts.throttling import LoginRateThrottle, RegisterRateThrottle


# Register view: Creates a new user account and returns JWT tokens so the user is immediately logged in.
class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [RegisterRateThrottle]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


# Login view: Verifies email and password, then returns new JWT access and refresh tokens.
class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.user
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )


# Refresh view: Takes a valid refresh token and issues a new access token without needing the password again.
class CustomTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]
    serializer_class = CustomTokenRefreshSerializer


# Profile view: Lets a logged-in user view their profile or update their display name.
class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [MongoJWTAuthentication]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = UpdateUserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)
