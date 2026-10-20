
import logging
from dataclasses import dataclass
from functools import lru_cache

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from app.core.config import get_settings
from app.core.errors import AppError

logger = logging.getLogger("app.auth")

_bearer = HTTPBearer(auto_error=False)
_ALGORITHMS = ["RS256", "ES256"]  # asymmetric only. HS256 is never accepted.
_AUDIENCE = "authenticated"


@dataclass(frozen=True)
class AuthUser:
    id: str
    email: str | None


@lru_cache
def _jwks_client(jwks_url: str) -> PyJWKClient:
    return PyJWKClient(jwks_url, cache_keys=True, lifespan=600, timeout=5)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> AuthUser:
    if credentials is None:
        raise AppError("UNAUTHORIZED", "Sign in to continue.", 401)

    settings = get_settings()
    if not settings.supabase_url:
        raise AppError("AUTH_NOT_CONFIGURED", "Sign-in is not configured.", 503)

    token = credentials.credentials
    try:
        signing_key = _jwks_client(settings.jwks_url).get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=_ALGORITHMS,
            audience=_AUDIENCE,
            issuer=settings.jwt_issuer,
            options={"require": ["exp", "sub"]},
        )
    except jwt.PyJWKClientConnectionError:
        logger.warning("Could not reach the token key endpoint")
        raise AppError(
            "AUTH_UNAVAILABLE", "Could not verify your session right now.", 503
        ) from None
    except jwt.PyJWTError as exc:
        # PyJWT messages describe the problem and never contain the token itself.
        logger.info("Rejected token: %s: %s", type(exc).__name__, exc)
        raise AppError(
            "UNAUTHORIZED",
            "Your session is invalid or has expired. Please sign in again.",
            401,
        ) from None

    return AuthUser(id=str(claims["sub"]), email=claims.get("email"))

