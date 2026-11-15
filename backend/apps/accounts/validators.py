import re
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email as django_validate_email
from rest_framework import serializers


def validate_email_format(value):
    """Validate email format and return normalized email address."""
    if not value or not isinstance(value, str):
        raise serializers.ValidationError("Email address is required.")

    cleaned_email = value.strip().lower()
    try:
        django_validate_email(cleaned_email)
    except DjangoValidationError:
        raise serializers.ValidationError("Enter a valid email address.")

    return cleaned_email


def validate_password_strength(value):
    """
    Validate that password meets strength criteria:
    - At least 8 characters long
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    """
    if not value or not isinstance(value, str):
        raise serializers.ValidationError("Password is required.")

    errors = []
    if len(value) < 8:
        errors.append("Password must be at least 8 characters long.")
    if not re.search(r"[A-Z]", value):
        errors.append("Password must contain at least one uppercase letter.")
    if not re.search(r"[a-z]", value):
        errors.append("Password must contain at least one lowercase letter.")
    if not re.search(r"\d", value):
        errors.append("Password must contain at least one digit.")

    if errors:
        raise serializers.ValidationError(errors)

    return value
