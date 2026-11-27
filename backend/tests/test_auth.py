import time
import uuid

import jwt
from cryptography.hazmat.primitives.asymmetric import ec

from app import auth as auth_module
from app.config import get_settings

from .conftest import JWT_SECRET, create_user, make_token


def test_health_needs_no_login(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_no_token_is_401(client):
    response = client.get("/api/v1/shops/me")
    assert response.status_code == 401
    assert response.json()["code"] == "not_logged_in"


def test_garbage_token_is_401(client):
    response = client.get("/api/v1/shops/me", headers={"Authorization": "Bearer nonsense"})
    assert response.status_code == 401
    assert response.json()["code"] == "invalid_token"


def test_wrong_secret_is_401(client):
    user_id, _ = create_user("owner")
    bad = jwt.encode(
        {"sub": str(user_id), "aud": "authenticated", "exp": int(time.time()) + 60},
        "another-secret-that-is-long-enough-123",
        algorithm="HS256",
    )
    response = client.get("/api/v1/shops/me", headers={"Authorization": f"Bearer {bad}"})
    assert response.status_code == 401
    assert response.json()["code"] == "invalid_token"


def test_expired_token_is_401(client):
    user_id, _ = create_user("owner")
    token = make_token(user_id, exp=int(time.time()) - 10)
    response = client.get("/api/v1/shops/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    assert response.json()["code"] == "token_expired"


def test_wrong_audience_is_401(client):
    user_id, _ = create_user("owner")
    token = make_token(user_id, aud="something-else")
    response = client.get("/api/v1/shops/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_valid_login_without_profile_is_403(client):
    token = make_token(uuid.uuid4())
    response = client.get("/api/v1/shops/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403
    assert response.json()["code"] == "no_profile"


def test_role_comes_from_profiles_not_from_the_token(client):
    # A customer who writes role=owner into their own token claims gets nothing.
    user_id, _ = create_user("customer")
    token = make_token(user_id, user_metadata={"role": "owner"}, role="owner")
    response = client.get("/api/v1/shops/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403
    assert response.json()["code"] == "forbidden"


def test_public_key_token_is_checked_with_jwks(client, monkeypatch):
    """Newer Supabase projects sign with a key pair (ES256) and publish the public key."""
    user_id, _ = create_user("owner")
    private_key = ec.generate_private_key(ec.SECP256R1())
    token = jwt.encode(
        {"sub": str(user_id), "aud": "authenticated", "exp": int(time.time()) + 60},
        private_key,
        algorithm="ES256",
        headers={"kid": "k1"},
    )

    class FakeKey:
        key = private_key.public_key()

    class FakeJwksClient:
        def get_signing_key_from_jwt(self, _token):
            return FakeKey()

    monkeypatch.setattr(auth_module, "_jwks_client", lambda _url: FakeJwksClient())
    response = client.get("/api/v1/shops/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200


def test_settings_are_read_from_the_environment():
    assert get_settings().supabase_jwt_secret == JWT_SECRET
