"""
Production settings.
"""
import mongoengine
from decouple import config
from .base import *  # noqa: F401,F403

DEBUG = False

CORS_ALLOWED_ORIGINS = config("CORS_ALLOWED_ORIGINS", cast=lambda v: [s.strip() for s in v.split(",")])

MONGO_URI = config("MONGO_URI")
mongoengine.connect(host=MONGO_URI)

SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
