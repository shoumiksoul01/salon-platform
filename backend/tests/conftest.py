"""Backend tests run against a real PostgreSQL (the double-booking rule and the other
checks live in the database, so a fake would prove nothing).

Needs an EMPTY throwaway database. The name must contain "test", because the tests
drop and recreate the public and auth schemas in it:

    createdb salon_test
    $env:TEST_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/salon_test"
    pytest
"""

import os
import time
import uuid
from pathlib import Path

import jwt
import psycopg
import pytest
from fastapi.testclient import TestClient

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/salon_test"
)
JWT_SECRET = "test-secret-with-at-least-32-characters-ok"
SUPABASE_URL = "https://example-ref.supabase.co"

# Must be set before app.config is first used.
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ["SUPABASE_JWT_SECRET"] = JWT_SECRET
os.environ["SUPABASE_URL"] = SUPABASE_URL
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "test-service-key"

from app.db import close_pool  # noqa: E402
from app.main import app  # noqa: E402
from app.storage import get_storage  # noqa: E402

SCHEMA_FILE = Path(__file__).resolve().parents[2] / "docs" / "schema.sql"


class FakeStorage:
    """Keeps files in memory, so tests never call Supabase."""

    def __init__(self) -> None:
        self.files: dict[str, bytes] = {}

    def upload(self, bucket: str, path: str, content: bytes, content_type: str) -> None:
        self.files[f"{bucket}/{path}"] = content

    def delete(self, bucket: str, path: str) -> None:
        self.files.pop(f"{bucket}/{path}", None)

    def public_url(self, bucket: str, path: str) -> str:
        return f"https://files.test/public/{bucket}/{path}"

    def signed_url(self, bucket: str, path: str) -> str:
        return f"https://files.test/{bucket}/{path}?token=x"


@pytest.fixture(scope="session", autouse=True)
def database():
    db_name = TEST_DATABASE_URL.rsplit("/", 1)[-1].split("?")[0]
    assert "test" in db_name, f"Refusing to wipe database {db_name!r}: its name must contain 'test'"

    with psycopg.connect(TEST_DATABASE_URL, autocommit=True) as conn:
        conn.execute("drop schema if exists public cascade")
        conn.execute("drop schema if exists auth cascade")
        conn.execute("create schema public")
        conn.execute("create schema auth")
        # Stand-in for Supabase's auth.users (only what the schema needs).
        conn.execute("create table auth.users (id uuid primary key, email text)")
        conn.execute(SCHEMA_FILE.read_text(encoding="utf-8"))
    yield
    close_pool()


@pytest.fixture(autouse=True)
def clean_tables(database):
    with psycopg.connect(TEST_DATABASE_URL, autocommit=True) as conn:
        # Cascades to profiles, shops and everything below them.
        conn.execute("truncate auth.users cascade")


@pytest.fixture
def storage():
    fake = FakeStorage()
    app.dependency_overrides[get_storage] = lambda: fake
    yield fake
    app.dependency_overrides.pop(get_storage, None)


@pytest.fixture
def client(storage):
    return TestClient(app)


def make_token(user_id: uuid.UUID, **overrides) -> str:
    claims = {
        "sub": str(user_id),
        "aud": "authenticated",
        "email": "someone@example.com",
        "exp": int(time.time()) + 3600,
        **overrides,
    }
    return jwt.encode(claims, JWT_SECRET, algorithm="HS256")


def create_user(role: str = "customer", full_name: str = "Test User", phone: str | None = None):
    """Inserts an auth user and its profile. Returns (user_id, auth headers)."""
    user_id = uuid.uuid4()
    with psycopg.connect(TEST_DATABASE_URL, autocommit=True) as conn:
        conn.execute(
            "insert into auth.users (id, email) values (%s, %s)", (user_id, f"{user_id}@example.com")
        )
        conn.execute(
            "insert into public.profiles (id, full_name, phone, role) values (%s, %s, %s, %s)",
            (user_id, full_name, phone, role),
        )
    return user_id, {"Authorization": f"Bearer {make_token(user_id)}"}


def run_sql(sql: str, params: tuple = ()) -> list[tuple]:
    with psycopg.connect(TEST_DATABASE_URL, autocommit=True) as conn:
        cur = conn.execute(sql, params)
        return cur.fetchall() if cur.description else []
