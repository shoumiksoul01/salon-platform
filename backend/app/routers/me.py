"""C-05 Manage profile and C-07 saved language: the signed-in user's own profile.

Limited update policy: a user may change only their name, phone and language.
The role can never be changed here, and the email belongs to Supabase Auth, so a
body with any other field is refused (422). Every role may use these endpoints.
Response shape = frontend/src/api/profile.ts (`Profile`), so wiring is only a swap.
"""

import re
import uuid
from typing import Literal

from fastapi import APIRouter, Depends
from psycopg import Connection
from pydantic import BaseModel, ConfigDict, Field, field_validator

from ..auth import CurrentUser, get_current_user
from ..db import get_conn
from ..errors import ApiError

router = APIRouter(prefix="/me", tags=["profile (C-05, C-07)"])

# Same rule as frontend/src/pages/customer/ProfilePage.tsx.
PHONE_PATTERN = re.compile(r"^(?:\+?88)?01[3-9]\d{8}$")
Language = Literal["bn", "en"]


class Profile(BaseModel):
    id: uuid.UUID
    full_name: str
    phone: str | None
    email: str | None  # read only: the email is the login (it lives in auth.users)
    preferred_language: Language | None  # null = not chosen yet


class ProfileUpdate(BaseModel):
    """Only the fields that are sent are changed. Unknown fields (role, email, ...) are refused."""

    model_config = ConfigDict(extra="forbid")

    full_name: str | None = Field(default=None, max_length=120)
    phone: str | None = None  # null or "" removes the phone number
    preferred_language: Language | None = None

    @field_validator("full_name")
    @classmethod
    def check_name(cls, value: str | None) -> str:
        # Only runs when full_name was sent, so null means "empty name": refused.
        if value is None or not value.strip():
            raise ValueError("full_name cannot be empty")
        return value.strip()

    @field_validator("phone")
    @classmethod
    def check_phone(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        value = value.strip()
        if not PHONE_PATTERN.match(value):
            raise ValueError("phone must be a Bangladeshi mobile number")
        # Stored the same way as at signup: without the +88 prefix.
        return re.sub(r"^\+?88", "", value)

    @field_validator("preferred_language")
    @classmethod
    def check_language(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("preferred_language must be bn or en")
        return value


def _load_profile(conn: Connection, user: CurrentUser) -> Profile:
    # get_current_user already proved that the row exists.
    row = conn.execute(
        "select id, full_name, phone, preferred_language from public.profiles where id = %s",
        (user.id,),
    ).fetchone()
    return Profile(
        id=row["id"],
        full_name=row["full_name"],
        phone=row["phone"],
        email=user.email,
        preferred_language=row["preferred_language"],
    )


@router.get("", response_model=Profile)
def get_profile(
    user: CurrentUser = Depends(get_current_user), conn: Connection = Depends(get_conn)
) -> Profile:
    return _load_profile(conn, user)


@router.patch("", response_model=Profile)
def update_profile(
    body: ProfileUpdate,
    user: CurrentUser = Depends(get_current_user),
    conn: Connection = Depends(get_conn),
) -> Profile:
    sent = body.model_fields_set
    if not sent:
        raise ApiError(400, "nothing_to_update", "Send at least one field to change")

    current = _load_profile(conn, user)
    conn.execute(
        "update public.profiles set full_name = %s, phone = %s, preferred_language = %s "
        "where id = %s",
        (
            body.full_name if "full_name" in sent else current.full_name,
            body.phone if "phone" in sent else current.phone,
            body.preferred_language if "preferred_language" in sent else current.preferred_language,
            user.id,
        ),
    )
    return _load_profile(conn, user)
