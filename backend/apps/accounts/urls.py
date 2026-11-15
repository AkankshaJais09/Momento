from django.urls import re_path
from apps.accounts.views import (
    RegisterView,
    LoginView,
    CustomTokenRefreshView,
    UserProfileView,
)

urlpatterns = [
    re_path(r"^register/?$", RegisterView.as_view(), name="register"),
    re_path(r"^login/?$", LoginView.as_view(), name="login"),
    re_path(r"^refresh/?$", CustomTokenRefreshView.as_view(), name="token_refresh"),
    re_path(r"^me/?$", UserProfileView.as_view(), name="user_profile"),
]
