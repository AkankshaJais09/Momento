from rest_framework.throttling import AnonRateThrottle


class RegisterRateThrottle(AnonRateThrottle):
    scope = "auth_register"


class LoginRateThrottle(AnonRateThrottle):
    scope = "auth_login"
