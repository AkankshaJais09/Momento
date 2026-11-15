# User model storing account information including email, hashed password, and display name.
# Authenticates with email instead of a username.

import mongoengine as me
from datetime import datetime
from django.contrib.auth.hashers import make_password, check_password


class User(me.Document):
    """
    Stores user account credentials and profile name.
    Uses email as the unique login field.
    """

    email = me.EmailField(required=True, unique=True)
    display_name = me.StringField(required=True, max_length=100)
    password = me.StringField(required=True)
    is_active = me.BooleanField(default=True)
    created_at = me.DateTimeField(default=datetime.utcnow)
    updated_at = me.DateTimeField(default=datetime.utcnow)

    meta = {
        "collection": "users",
        "ordering": ["-created_at"],
        "indexes": ["email"],
    }

    def save(self, *args, **kwargs):
        self.updated_at = datetime.utcnow()
        if self.email:
            self.email = self.email.strip().lower()
        return super().save(*args, **kwargs)

    def set_password(self, raw_password):
        # Hash password securely before storing
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        # Verify entered password against the stored hash
        return check_password(raw_password, self.password)

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    @property
    def pk(self):
        return str(self.id)

    def __str__(self):
        return self.email
