from datetime import timedelta
import mongoengine
import mongomock
import pytest
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from apps.accounts.models import User


@pytest.fixture(autouse=True)
def setup_test_db():
    """Isolate each test in a mock MongoEngine database and reset cache."""
    mongoengine.disconnect()
    mongoengine.connect("test_accounts_db", host="localhost", mongo_client_class=mongomock.MongoClient)
    User.drop_collection()
    cache.clear()
    yield
    User.drop_collection()
    cache.clear()
    mongoengine.disconnect()


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def registered_user():
    user = User(
        email="testuser@example.com",
        display_name="Test User",
    )
    user.set_password("SecurePass123")
    user.save()
    return user


@pytest.fixture
def auth_client(registered_user):
    client = APIClient()
    refresh = RefreshToken.for_user(registered_user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return client, registered_user, refresh


class TestRegistration:
    def test_register_success(self, client):
        payload = {
            "email": "newuser@example.com",
            "display_name": "New User",
            "password": "ValidPass123",
        }
        response = client.post("/api/auth/register", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert "access" in response.data
        assert "refresh" in response.data
        assert "user" in response.data
        assert response.data["user"]["email"] == "newuser@example.com"
        assert response.data["user"]["display_name"] == "New User"
        assert "id" in response.data["user"]

        # Ensure user exists in database with hashed password
        created = User.objects(email="newuser@example.com").first()
        assert created is not None
        assert created.check_password("ValidPass123") is True
        assert created.password != "ValidPass123"

    def test_register_duplicate_email(self, client, registered_user):
        payload = {
            "email": "testuser@example.com",
            "display_name": "Another Name",
            "password": "ValidPass123",
        }
        response = client.post("/api/auth/register", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "email" in response.data
        assert "already exists" in str(response.data["email"])

    def test_register_duplicate_email_case_insensitive(self, client, registered_user):
        payload = {
            "email": "TESTUSER@EXAMPLE.COM",
            "display_name": "Another Name",
            "password": "ValidPass123",
        }
        response = client.post("/api/auth/register", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "email" in response.data
        assert "already exists" in str(response.data["email"])

    def test_register_invalid_email_format(self, client):
        invalid_emails = ["not-an-email", "missingdomain@", "@nodomain.com", "spaces in@email.com"]
        for email in invalid_emails:
            payload = {
                "email": email,
                "display_name": "Invalid Email",
                "password": "ValidPass123",
            }
            response = client.post("/api/auth/register", payload, format="json")
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert "email" in response.data

    def test_register_weak_password_too_short(self, client):
        payload = {
            "email": "weak@example.com",
            "display_name": "Weak Pass",
            "password": "Short1",
        }
        response = client.post("/api/auth/register", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "password" in response.data
        assert any("at least 8 characters" in str(err) for err in response.data["password"])

    def test_register_weak_password_missing_uppercase(self, client):
        payload = {
            "email": "weak@example.com",
            "display_name": "Weak Pass",
            "password": "lowercase123",
        }
        response = client.post("/api/auth/register", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "password" in response.data
        assert any("uppercase" in str(err) for err in response.data["password"])

    def test_register_weak_password_missing_lowercase(self, client):
        payload = {
            "email": "weak@example.com",
            "display_name": "Weak Pass",
            "password": "UPPERCASE123",
        }
        response = client.post("/api/auth/register", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "password" in response.data
        assert any("lowercase" in str(err) for err in response.data["password"])

    def test_register_weak_password_missing_digit(self, client):
        payload = {
            "email": "weak@example.com",
            "display_name": "Weak Pass",
            "password": "NoDigitsHere",
        }
        response = client.post("/api/auth/register", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "password" in response.data
        assert any("digit" in str(err) for err in response.data["password"])

    def test_register_empty_display_name(self, client):
        payload = {
            "email": "name@example.com",
            "display_name": "   ",
            "password": "ValidPass123",
        }
        response = client.post("/api/auth/register", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "display_name" in response.data

    def test_register_rate_limit(self, client):
        for i in range(5):
            payload = {
                "email": f"ratelimit_{i}@example.com",
                "display_name": f"User {i}",
                "password": "ValidPass123",
            }
            res = client.post("/api/auth/register", payload, format="json")
            assert res.status_code == status.HTTP_201_CREATED

        # 6th request within a minute should be throttled
        blocked = client.post(
            "/api/auth/register",
            {
                "email": "ratelimit_blocked@example.com",
                "display_name": "Blocked User",
                "password": "ValidPass123",
            },
            format="json",
        )
        assert blocked.status_code == status.HTTP_429_TOO_MANY_REQUESTS


class TestLogin:
    def test_login_success(self, client, registered_user):
        payload = {
            "email": "testuser@example.com",
            "password": "SecurePass123",
        }
        response = client.post("/api/auth/login", payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh" in response.data
        assert response.data["user"]["email"] == "testuser@example.com"
        assert response.data["user"]["display_name"] == "Test User"

    def test_login_case_insensitive_email(self, client, registered_user):
        payload = {
            "email": "TESTUSER@EXAMPLE.COM",
            "password": "SecurePass123",
        }
        response = client.post("/api/auth/login", payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data

    def test_login_wrong_password(self, client, registered_user):
        payload = {
            "email": "testuser@example.com",
            "password": "WrongPassword999",
        }
        response = client.post("/api/auth/login", payload, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Invalid email or password." in str(response.data)

    def test_login_nonexistent_email(self, client):
        payload = {
            "email": "ghost@example.com",
            "password": "SecurePass123",
        }
        response = client.post("/api/auth/login", payload, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Invalid email or password." in str(response.data)

    def test_login_inactive_user(self, client, registered_user):
        registered_user.is_active = False
        registered_user.save()

        payload = {
            "email": "testuser@example.com",
            "password": "SecurePass123",
        }
        response = client.post("/api/auth/login", payload, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "inactive" in str(response.data).lower()

    def test_login_missing_fields(self, client):
        response = client.post("/api/auth/login", {"email": ""}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_rate_limit(self, client, registered_user):
        payload = {
            "email": "testuser@example.com",
            "password": "WrongPassword1",
        }
        for _ in range(5):
            res = client.post("/api/auth/login", payload, format="json")
            assert res.status_code == status.HTTP_401_UNAUTHORIZED

        # 6th request within a minute should be throttled
        blocked = client.post("/api/auth/login", payload, format="json")
        assert blocked.status_code == status.HTTP_429_TOO_MANY_REQUESTS


class TestTokenRefresh:
    def test_token_refresh_success(self, client, registered_user):
        refresh = RefreshToken.for_user(registered_user)
        response = client.post("/api/auth/refresh", {"refresh": str(refresh)}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data

    def test_token_refresh_expired_token(self, client, registered_user):
        refresh = RefreshToken.for_user(registered_user)
        refresh.set_exp(lifetime=-timedelta(seconds=60))
        response = client.post("/api/auth/refresh", {"refresh": str(refresh)}, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "token_not_valid" in str(response.data) or "expired" in str(response.data).lower()

    def test_token_refresh_invalid_token(self, client):
        response = client.post("/api/auth/refresh", {"refresh": "completely-invalid-jwt"}, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestUserProfile:
    def test_get_me_success(self, auth_client):
        client, user, _ = auth_client
        response = client.get("/api/auth/me")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["email"] == user.email
        assert response.data["display_name"] == user.display_name
        assert response.data["id"] == str(user.id)

    def test_get_me_unauthenticated(self, client):
        response = client.get("/api/auth/me")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_me_expired_token(self, client, registered_user):
        access = AccessToken.for_user(registered_user)
        access.set_exp(lifetime=-timedelta(seconds=60))
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(access)}")
        response = client.get("/api/auth/me")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "token_not_valid" in str(response.data) or "expired" in str(response.data).lower()

    def test_patch_me_success(self, auth_client):
        client, user, _ = auth_client
        payload = {"display_name": "Updated Display Name"}
        response = client.patch("/api/auth/me", payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["display_name"] == "Updated Display Name"

        # Check in database
        updated = User.objects(id=user.id).first()
        assert updated.display_name == "Updated Display Name"

    def test_patch_me_empty_display_name(self, auth_client):
        client, _, _ = auth_client
        payload = {"display_name": "   "}
        response = client.patch("/api/auth/me", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "display_name" in response.data

    def test_patch_me_unauthenticated(self, client):
        response = client.patch("/api/auth/me", {"display_name": "Hacker"}, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_patch_me_expired_token(self, client, registered_user):
        access = AccessToken.for_user(registered_user)
        access.set_exp(lifetime=-timedelta(seconds=60))
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(access)}")
        response = client.patch("/api/auth/me", {"display_name": "Updated Name"}, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "token_not_valid" in str(response.data) or "expired" in str(response.data).lower()
