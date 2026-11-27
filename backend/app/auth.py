"""Login check (C-06, backend side).

The browser logs in with Supabase Auth and sends the access token as
`Authorization: Bearer <token>`. This module checks the token and then reads the
role from public.profiles. The role is never taken from the token's own claims,
because the user can edit their own user_metadata.
"""

from functools import lru_cache
from uuid import UUID

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from psycopg import Connection
from pydantic import BaseModel

from .config import Settings, get_settings
from .db import get_conn
from .errors import ApiError

_bearer = HTTPBearer(auto_error=False)

# Supabase tokens are made for the "authenticated" audience.
_AUDIENCE = "authenticated"


class CurrentUser(BaseModel):
    id: UUID
    email: str | None
    full_name: str
    role: str  # customer, owner, staff or admin


@lru_cache
def _jwks_client(url: str) -> jwt.PyJWKClient:
    # Keeps the public keys in memory, so Supabase is not called on every request.
    return jwt.PyJWKClient(url, cache_keys=True, timeout=10)


def decode_token(token: str, settings: Settings) -> dict:
    """Returns the token's claims, or raises ApiError 401."""
    try:
        algorithm = jwt.get_unverified_header(token).get("alg")
        if algorithm == "HS256":
            if not settings.supabase_jwt_secret:
                raise ApiError(401, "invalid_token", "The login token is not valid")
            key: object = settings.supabase_jwt_secret
            algorithms = ["HS256"]
        else:
            if not settings.supabase_url:
                raise ApiError(500, "auth_not_configured", "SUPABASE_URL is not set")
            jwks_url = f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
            key = _jwks_client(jwks_url).get_signing_key_from_jwt(token).key
            algorithms = ["ES256", "RS256"]
        return jwt.decode(token, key, algorithms=algorithms, audience=_AUDIENCE)
    except jwt.ExpiredSignatureError:
        raise ApiError(401, "token_expired", "The login has expired, log in again") from None
    except (jwt.InvalidTokenError, jwt.PyJWKClientError):
        raise ApiError(401, "invalid_token", "The login token is not valid") from None


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    conn: Connection = Depends(get_conn),
) -> CurrentUser:
    if credentials is None:
        raise ApiError(401, "not_logged_in", "Log in first")

    claims = decode_token(credentials.credentials, get_settings())
    try:
        user_id = UUID(str(claims.get("sub")))
    except ValueError:
        raise ApiError(401, "invalid_token", "The login token is not valid") from None

    row = conn.execute(
        "select full_name, role from public.profiles where id = %s", (user_id,)
    ).fetchone()
    if row is None:
        # A valid login without a profile row: the signup trigger did not run.
        raise ApiError(403, "no_profile", "This account has no profile")

    email = claims.get("email")
    return CurrentUser(
        id=user_id,
        email=email if isinstance(email, str) else None,
        full_name=row["full_name"],
        role=row["role"],
    )


def require_role(*roles: str):
    """Dependency: only these roles may call the endpoint (403 for the others)."""

    def check(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in roles:
            raise ApiError(403, "forbidden", "Your account is not allowed to do this")
        return user

    return check
