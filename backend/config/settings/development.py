"""
Development settings.
"""
import mongoengine
from decouple import config
from .base import *  # noqa: F401,F403

DEBUG = True

CORS_ALLOWED_ORIGINS = config("CORS_ALLOWED_ORIGINS", cast=lambda v: [s.strip() for s in v.split(",")])

MONGO_URI = config("MONGO_URI", default="mongodb://localhost:27017/photodrop_dev")
mongoengine.connect(host=MONGO_URI)
