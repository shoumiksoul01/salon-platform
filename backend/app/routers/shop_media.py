"""FR-01.4 Upload virtual tour media: the owner's shop photos and tour link.

Response shape = frontend/src/api/ownerMedia.ts (`OwnerMedia`). Photos go to the
public bucket `shop-images`; the first photo is the cover.
"""

import uuid
from typing import Literal
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, File, Form, UploadFile
from psycopg import Connection
from pydantic import BaseModel

from ..auth import CurrentUser, require_role
from ..db import get_conn
from ..errors import ApiError
from ..storage import SHOP_IMAGES_BUCKET, Storage, get_storage
from .shop import _get_or_create_shop_row

router = APIRouter(prefix="/shops/me/media", tags=["shop photos and tour (FR-01.4)"])

# Same limits as frontend/src/api/ownerMedia.ts and api/services.ts.
MAX_PHOTOS = 10
ALT_MAX = 120
TOUR_URL_MAX = 300
MAX_IMAGE_BYTES = 2 * 1024 * 1024
ALLOWED_IMAGES = {  # extension -> content type
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
}


class ShopImage(BaseModel):
    id: uuid.UUID
    shop_id: uuid.UUID
    url: str
    alt_text: str
    sort_order: int


class OwnerMedia(BaseModel):
    images: list[ShopImage]
    tour_url: str | None


class AltTextBody(BaseModel):
    alt_text: str = ""


class MoveBody(BaseModel):
    direction: Literal[-1, 1]


class TourBody(BaseModel):
    tour_url: str = ""  # empty removes the tour


class TourResult(BaseModel):
    tour_url: str | None


OwnerOnly = Depends(require_role("owner"))


def _clean_alt(value: str) -> str:
    alt = value.strip()
    if len(alt) > ALT_MAX:
        raise ApiError(400, "alt_too_long", f"The description can have at most {ALT_MAX} characters")
    return alt


def _clean_tour_url(value: str) -> str | None:
    text = value.strip()
    if text == "":
        return None
    parsed = urlparse(text)
    if len(text) > TOUR_URL_MAX or parsed.scheme != "https" or not parsed.hostname:
        raise ApiError(400, "bad_url", "The tour link must be a valid https link")
    return text


def _media(conn: Connection, shop: dict, storage: Storage) -> OwnerMedia:
    rows = conn.execute(
        """
        select id, shop_id, url, alt_text, sort_order
        from shop_images where shop_id = %s order by sort_order, id
        """,
        (shop["id"],),
    ).fetchall()
    tour = conn.execute("select tour_url from shops where id = %s", (shop["id"],)).fetchone()
    return OwnerMedia(
        images=[
            ShopImage(
                id=r["id"],
                shop_id=r["shop_id"],
                # `url` holds the storage path; the public link is built from it.
                url=storage.public_url(SHOP_IMAGES_BUCKET, r["url"]),
                alt_text=r["alt_text"],
                sort_order=r["sort_order"],
            )
            for r in rows
        ],
        tour_url=tour["tour_url"] if tour else None,
    )


def _lock_shop(conn: Connection, user: CurrentUser) -> dict:
    """Finds (or makes) the owner's shop and locks its row until the request ends,
    so two requests cannot reorder the photos at the same time."""
    shop = _get_or_create_shop_row(conn, user)
    conn.execute("select id from shops where id = %s for update", (shop["id"],))
    return shop


def _renumber(conn: Connection, shop_id: uuid.UUID) -> None:
    conn.execute(
        """
        update shop_images s set sort_order = n.new_order
        from (
          select id, row_number() over (order by sort_order, id) - 1 as new_order
          from shop_images where shop_id = %s
        ) n
        where s.id = n.id and s.sort_order <> n.new_order
        """,
        (shop_id,),
    )


@router.get("", response_model=OwnerMedia)
def get_media(
    user: CurrentUser = OwnerOnly,
    conn: Connection = Depends(get_conn),
    storage: Storage = Depends(get_storage),
) -> OwnerMedia:
    shop = _get_or_create_shop_row(conn, user)
    return _media(conn, shop, storage)


@router.post("/images", response_model=OwnerMedia, status_code=201)
def add_image(
    file: UploadFile = File(...),
    alt_text: str = Form(""),
    user: CurrentUser = OwnerOnly,
    conn: Connection = Depends(get_conn),
    storage: Storage = Depends(get_storage),
) -> OwnerMedia:
    shop = _lock_shop(conn, user)
    alt = _clean_alt(alt_text)

    file_name = (file.filename or "").strip()
    extension = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else ""
    if extension not in ALLOWED_IMAGES:
        raise ApiError(400, "bad_type", "Only JPG, PNG or WebP pictures are accepted")
    content = file.file.read(MAX_IMAGE_BYTES + 1)
    if len(content) > MAX_IMAGE_BYTES:
        raise ApiError(400, "too_big", "The picture is bigger than 2 MB")
    if not content:
        raise ApiError(400, "bad_type", "The picture is empty")

    count = conn.execute(
        "select count(*) as n, coalesce(max(sort_order), -1) as last from shop_images where shop_id = %s",
        (shop["id"],),
    ).fetchone()
    assert count is not None
    if count["n"] >= MAX_PHOTOS:
        raise ApiError(409, "too_many", f"A shop can have at most {MAX_PHOTOS} photos")

    # The path uses a fresh id and a fixed extension, never the uploaded file name.
    path = f"{shop['id']}/{uuid.uuid4()}.{'jpg' if extension == 'jpeg' else extension}"
    storage.upload(SHOP_IMAGES_BUCKET, path, content, ALLOWED_IMAGES[extension])
    conn.execute(
        "insert into shop_images (shop_id, url, alt_text, sort_order) values (%s, %s, %s, %s)",
        (shop["id"], path, alt, count["last"] + 1),
    )
    conn.commit()
    return _media(conn, shop, storage)


@router.patch("/images/{image_id}", response_model=OwnerMedia)
def update_image(
    image_id: uuid.UUID,
    body: AltTextBody,
    user: CurrentUser = OwnerOnly,
    conn: Connection = Depends(get_conn),
    storage: Storage = Depends(get_storage),
) -> OwnerMedia:
    shop = _lock_shop(conn, user)
    alt = _clean_alt(body.alt_text)
    updated = conn.execute(
        "update shop_images set alt_text = %s where id = %s and shop_id = %s returning id",
        (alt, image_id, shop["id"]),
    ).fetchone()
    if updated is None:
        raise ApiError(404, "not_found", "Photo not found")
    conn.commit()
    return _media(conn, shop, storage)


@router.post("/images/{image_id}/move", response_model=OwnerMedia)
def move_image(
    image_id: uuid.UUID,
    body: MoveBody,
    user: CurrentUser = OwnerOnly,
    conn: Connection = Depends(get_conn),
    storage: Storage = Depends(get_storage),
) -> OwnerMedia:
    shop = _lock_shop(conn, user)
    _renumber(conn, shop["id"])  # makes the order 0, 1, 2, ... with no gaps
    ids = [
        r["id"]
        for r in conn.execute(
            "select id from shop_images where shop_id = %s order by sort_order", (shop["id"],)
        ).fetchall()
    ]
    if image_id not in ids:
        raise ApiError(404, "not_found", "Photo not found")
    index = ids.index(image_id)
    target = index + body.direction
    if 0 <= target < len(ids):  # at the edge nothing moves, like the mock
        ids[index], ids[target] = ids[target], ids[index]
        for order, current in enumerate(ids):
            conn.execute("update shop_images set sort_order = %s where id = %s", (order, current))
    conn.commit()
    return _media(conn, shop, storage)


@router.delete("/images/{image_id}", response_model=OwnerMedia)
def remove_image(
    image_id: uuid.UUID,
    user: CurrentUser = OwnerOnly,
    conn: Connection = Depends(get_conn),
    storage: Storage = Depends(get_storage),
) -> OwnerMedia:
    shop = _lock_shop(conn, user)
    deleted = conn.execute(
        "delete from shop_images where id = %s and shop_id = %s returning url",
        (image_id, shop["id"]),
    ).fetchone()
    if deleted is None:
        raise ApiError(404, "not_found", "Photo not found")
    _renumber(conn, shop["id"])
    conn.commit()
    storage.delete(SHOP_IMAGES_BUCKET, deleted["url"])
    return _media(conn, shop, storage)


@router.put("/tour", response_model=TourResult)
def save_tour(
    body: TourBody,
    user: CurrentUser = OwnerOnly,
    conn: Connection = Depends(get_conn),
) -> TourResult:
    shop = _get_or_create_shop_row(conn, user)
    url = _clean_tour_url(body.tour_url)
    conn.execute("update shops set tour_url = %s, updated_at = now() where id = %s", (url, shop["id"]))
    conn.commit()
    return TourResult(tour_url=url)
