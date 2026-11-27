"""FR-01.1 Create shop profile: the signed-in owner's own shop.

A shop starts as a draft, the owner fills it in, uploads the trade licence and
submits it for admin approval (FR-10.1 approves or rejects it later).
Response shape = frontend/src/api/shop.ts (`Shop`), so wiring is only a swap.
"""

import re
import uuid
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, File, Response, UploadFile
from psycopg import Connection
from pydantic import BaseModel, Field, field_validator, model_validator

from ..auth import CurrentUser, require_role
from ..db import get_conn
from ..errors import ApiError
from ..storage import SHOP_DOCUMENTS_BUCKET, Storage, get_storage

router = APIRouter(prefix="/shops/me", tags=["shop setup (FR-01.1)"])

# Same rules as frontend/src/pages/owner/ShopSetupPage.tsx.
PHONE_PATTERN = re.compile(r"^(?:\+?88)?01[3-9]\d{8}$")
TIME_PATTERN = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
MAX_FILE_BYTES = 5 * 1024 * 1024
MAX_DOCUMENTS = 5
ALLOWED_FILES = {  # extension -> content type
    "pdf": "application/pdf",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
}
# draft and rejected shops can be submitted; pending and suspended shops are locked.
LOCKED_STATUSES = ("pending", "suspended")
SUBMITTABLE_STATUSES = ("draft", "rejected")

GenderCategory = Literal["men", "women", "unisex"]


class WorkingHour(BaseModel):
    day_of_week: int = Field(ge=0, le=6)  # 0 = Sunday
    is_closed: bool
    opens_at: str  # 'HH:MM', local shop time
    closes_at: str

    @field_validator("opens_at", "closes_at")
    @classmethod
    def check_time(cls, value: str) -> str:
        if not TIME_PATTERN.match(value):
            raise ValueError("time must look like 09:30")
        return value

    @model_validator(mode="after")
    def check_order(self) -> "WorkingHour":
        if not self.is_closed and self.opens_at >= self.closes_at:
            raise ValueError("opens_at must be before closes_at")
        return self


class ShopDocument(BaseModel):
    id: uuid.UUID
    doc_type: Literal["trade_licence", "other"]
    file_name: str
    file_url: str  # short-lived signed link; empty if it could not be made
    uploaded_at: str  # ISO 8601, UTC


class ShopInput(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=500)
    address: str = Field(min_length=1, max_length=300)
    area: str = Field(default="", max_length=80)
    phone: str
    gender_category: GenderCategory
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    working_hours: list[WorkingHour]

    @field_validator("name", "description", "address", "area", "phone")
    @classmethod
    def strip(cls, value: str) -> str:
        return value.strip()

    @field_validator("phone")
    @classmethod
    def check_phone(cls, value: str) -> str:
        if not PHONE_PATTERN.match(value):
            raise ValueError("phone must be a Bangladeshi mobile number")
        return value

    @model_validator(mode="after")
    def check_rest(self) -> "ShopInput":
        if not self.name or not self.address:
            raise ValueError("name and address cannot be empty")
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("latitude and longitude go together")
        if sorted(h.day_of_week for h in self.working_hours) != list(range(7)):
            raise ValueError("working_hours needs exactly one entry for each day 0 to 6")
        if all(h.is_closed for h in self.working_hours):
            raise ValueError("at least one day must be open")
        return self


class Shop(BaseModel):
    id: uuid.UUID
    name: str
    description: str
    address: str
    area: str
    phone: str
    gender_category: GenderCategory
    latitude: float | None
    longitude: float | None
    working_hours: list[WorkingHour]
    status: Literal["draft", "pending", "approved", "rejected", "suspended"]
    approval_reason: str | None
    documents: list[ShopDocument]


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------


def _float(value: Decimal | None) -> float | None:
    return None if value is None else float(value)


def _load_shop_row(conn: Connection, owner_id: uuid.UUID) -> dict | None:
    # One shop per owner. The oldest one wins if there were ever two.
    return conn.execute(
        "select * from shops where owner_id = %s order by created_at limit 1", (owner_id,)
    ).fetchone()


def _create_blank_shop(conn: Connection, owner_id: uuid.UUID, phone: str | None) -> dict:
    row = conn.execute(
        "insert into shops (owner_id, name, phone) values (%s, '', %s) returning *",
        (owner_id, phone),
    ).fetchone()
    assert row is not None
    # Open every day 10:00 to 20:00, like the frontend's starting form.
    conn.execute(
        """
        insert into shop_working_hours (shop_id, day_of_week, opens_at, closes_at, is_closed)
        select %s, d, '10:00', '20:00', false from generate_series(0, 6) as d
        """,
        (row["id"],),
    )
    return row


def _get_or_create_shop_row(conn: Connection, user: CurrentUser) -> dict:
    row = _load_shop_row(conn, user.id)
    if row is None:
        profile = conn.execute(
            "select phone from public.profiles where id = %s", (user.id,)
        ).fetchone()
        row = _create_blank_shop(conn, user.id, profile["phone"] if profile else None)
        conn.commit()
    return row


def _shop_response(conn: Connection, row: dict, storage: Storage) -> Shop:
    hours = conn.execute(
        """
        select day_of_week, is_closed,
               to_char(opens_at, 'HH24:MI') as opens_at,
               to_char(closes_at, 'HH24:MI') as closes_at
        from shop_working_hours where shop_id = %s order by day_of_week
        """,
        (row["id"],),
    ).fetchall()
    documents = conn.execute(
        """
        select id, doc_type, file_name, file_url, uploaded_at
        from shop_documents where shop_id = %s order by uploaded_at
        """,
        (row["id"],),
    ).fetchall()
    return Shop(
        id=row["id"],
        name=row["name"],
        description=row["description"],
        address=row["address"],
        area=row["area"],
        phone=row["phone"] or "",
        gender_category=row["gender_category"],
        latitude=_float(row["latitude"]),
        longitude=_float(row["longitude"]),
        working_hours=[WorkingHour(**h) for h in hours],
        status=row["status"],
        approval_reason=row["approval_reason"],
        documents=[
            ShopDocument(
                id=d["id"],
                doc_type=d["doc_type"],
                file_name=d["file_name"],
                file_url=storage.signed_url(SHOP_DOCUMENTS_BUCKET, d["file_url"]),
                uploaded_at=d["uploaded_at"].isoformat().replace("+00:00", "Z"),
            )
            for d in documents
        ],
    )


def _check_not_locked(row: dict) -> None:
    if row["status"] in LOCKED_STATUSES:
        raise ApiError(
            409,
            "shop_locked",
            "The shop cannot be changed while it is waiting for approval or suspended",
        )


def _safe_name(file_name: str) -> str:
    # Keeps only letters, digits, dot, dash and underscore for the storage path.
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", file_name).strip("._")
    return cleaned[-80:] or "file"


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

OwnerOnly = Depends(require_role("owner"))


@router.get("", response_model=Shop)
def get_my_shop(
    user: CurrentUser = OwnerOnly,
    conn: Connection = Depends(get_conn),
    storage: Storage = Depends(get_storage),
) -> Shop:
    row = _get_or_create_shop_row(conn, user)
    return _shop_response(conn, row, storage)


@router.patch("", response_model=Shop)
def save_my_shop(
    body: ShopInput,
    user: CurrentUser = OwnerOnly,
    conn: Connection = Depends(get_conn),
    storage: Storage = Depends(get_storage),
) -> Shop:
    row = _get_or_create_shop_row(conn, user)
    _check_not_locked(row)

    updated = conn.execute(
        """
        update shops set name = %s, description = %s, address = %s, area = %s, phone = %s,
                         gender_category = %s, latitude = %s, longitude = %s, updated_at = now()
        where id = %s returning *
        """,
        (
            body.name,
            body.description,
            body.address,
            body.area,
            body.phone,
            body.gender_category,
            body.latitude,
            body.longitude,
            row["id"],
        ),
    ).fetchone()
    assert updated is not None
    for hour in body.working_hours:
        conn.execute(
            """
            insert into shop_working_hours (shop_id, day_of_week, opens_at, closes_at, is_closed)
            values (%s, %s, %s, %s, %s)
            on conflict (shop_id, day_of_week) do update
              set opens_at = excluded.opens_at, closes_at = excluded.closes_at,
                  is_closed = excluded.is_closed
            """,
            (row["id"], hour.day_of_week, hour.opens_at, hour.closes_at, hour.is_closed),
        )
    conn.commit()  # commit here, so the reply never arrives before the data is saved
    return _shop_response(conn, updated, storage)


@router.post("/documents", response_model=ShopDocument, status_code=201)
def upload_document(
    file: UploadFile = File(...),
    user: CurrentUser = OwnerOnly,
    conn: Connection = Depends(get_conn),
    storage: Storage = Depends(get_storage),
) -> ShopDocument:
    row = _get_or_create_shop_row(conn, user)
    _check_not_locked(row)

    file_name = (file.filename or "").strip()
    extension = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else ""
    if extension not in ALLOWED_FILES:
        raise ApiError(400, "bad_file_type", "Only PDF, JPG or PNG files are accepted")

    content = file.file.read(MAX_FILE_BYTES + 1)
    if len(content) > MAX_FILE_BYTES:
        raise ApiError(400, "file_too_big", "The file is bigger than 5 MB")
    if not content:
        raise ApiError(400, "empty_file", "The file is empty")

    count = conn.execute(
        "select count(*) as n from shop_documents where shop_id = %s", (row["id"],)
    ).fetchone()
    if count is not None and count["n"] >= MAX_DOCUMENTS:
        raise ApiError(409, "too_many_documents", "Remove a document before adding another")

    path = f"{row['id']}/{uuid.uuid4()}-{_safe_name(file_name)}"
    storage.upload(SHOP_DOCUMENTS_BUCKET, path, content, ALLOWED_FILES[extension])

    inserted = conn.execute(
        """
        insert into shop_documents (shop_id, doc_type, file_name, file_url)
        values (%s, 'trade_licence', %s, %s)
        returning id, doc_type, file_name, uploaded_at
        """,
        (row["id"], file_name[-200:], path),
    ).fetchone()
    assert inserted is not None
    conn.commit()
    return ShopDocument(
        id=inserted["id"],
        doc_type=inserted["doc_type"],
        file_name=inserted["file_name"],
        file_url=storage.signed_url(SHOP_DOCUMENTS_BUCKET, path),
        uploaded_at=inserted["uploaded_at"].isoformat().replace("+00:00", "Z"),
    )


@router.delete("/documents/{document_id}", status_code=204)
def delete_document(
    document_id: uuid.UUID,
    user: CurrentUser = OwnerOnly,
    conn: Connection = Depends(get_conn),
    storage: Storage = Depends(get_storage),
) -> Response:
    row = _get_or_create_shop_row(conn, user)
    _check_not_locked(row)

    deleted = conn.execute(
        "delete from shop_documents where id = %s and shop_id = %s returning file_url",
        (document_id, row["id"]),
    ).fetchone()
    if deleted is None:
        raise ApiError(404, "document_not_found", "Document not found")
    conn.commit()
    storage.delete(SHOP_DOCUMENTS_BUCKET, deleted["file_url"])
    return Response(status_code=204)


@router.post("/submit", response_model=Shop)
def submit_for_approval(
    user: CurrentUser = OwnerOnly,
    conn: Connection = Depends(get_conn),
    storage: Storage = Depends(get_storage),
) -> Shop:
    row = _get_or_create_shop_row(conn, user)
    if row["status"] not in SUBMITTABLE_STATUSES:
        raise ApiError(409, "invalid_status", "This shop cannot be submitted now")

    missing: list[str] = []
    if not row["name"].strip():
        missing.append("name")
    if not row["address"].strip():
        missing.append("address")
    if not row["phone"] or not PHONE_PATTERN.match(row["phone"]):
        missing.append("phone")
    if row["latitude"] is None or row["longitude"] is None:
        missing.append("location")
    has_licence = conn.execute(
        "select 1 from shop_documents where shop_id = %s and doc_type = 'trade_licence' limit 1",
        (row["id"],),
    ).fetchone()
    if has_licence is None:
        missing.append("licence")
    has_open_day = conn.execute(
        "select 1 from shop_working_hours where shop_id = %s and not is_closed limit 1",
        (row["id"],),
    ).fetchone()
    if has_open_day is None:
        missing.append("hours")
    if missing:
        raise ApiError(
            400,
            "shop_incomplete",
            "Complete the shop profile before submitting: " + ", ".join(missing),
            missing=missing,
        )

    submitted = conn.execute(
        """
        update shops set status = 'pending', approval_reason = null, updated_at = now()
        where id = %s returning *
        """,
        (row["id"],),
    ).fetchone()
    assert submitted is not None
    conn.commit()
    return _shop_response(conn, submitted, storage)
