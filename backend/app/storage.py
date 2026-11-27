"""Private file storage on Supabase Storage (REST API, service role key).

The trade licence is a private document: the bucket is not public, files are
stored by path, and the API hands out short-lived signed links.
"""

import httpx
from fastapi import Depends

from .config import Settings, get_settings
from .errors import ApiError

SHOP_DOCUMENTS_BUCKET = "shop-documents"  # private: trade licences
SHOP_IMAGES_BUCKET = "shop-images"  # public: photos shown on the shop page
SIGNED_URL_SECONDS = 3600


class Storage:
    def __init__(self, settings: Settings) -> None:
        self._base = settings.supabase_url.rstrip("/")
        self._key = settings.supabase_service_role_key

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self._key}", "apikey": self._key}

    def _check_configured(self) -> None:
        if not self._base or not self._key:
            raise ApiError(
                503, "storage_not_configured", "File storage is not configured on the server"
            )

    def upload(self, bucket: str, path: str, content: bytes, content_type: str) -> None:
        self._check_configured()
        try:
            response = httpx.post(
                f"{self._base}/storage/v1/object/{bucket}/{path}",
                content=content,
                headers={**self._headers(), "Content-Type": content_type},
                timeout=30,
            )
        except httpx.HTTPError:
            raise ApiError(502, "storage_failed", "Could not save the file, try again") from None
        if response.status_code >= 400:
            raise ApiError(502, "storage_failed", "Could not save the file, try again")

    def delete(self, bucket: str, path: str) -> None:
        # A file that is already gone is fine; a storage error must not block the owner.
        self._check_configured()
        try:
            httpx.request(
                "DELETE",
                f"{self._base}/storage/v1/object/{bucket}",
                json={"prefixes": [path]},
                headers=self._headers(),
                timeout=30,
            )
        except httpx.HTTPError:
            pass

    def public_url(self, bucket: str, path: str) -> str:
        # Permanent link for a file in a public bucket (no request needed).
        return f"{self._base}/storage/v1/object/public/{bucket}/{path}"

    def signed_url(self, bucket: str, path: str) -> str:
        self._check_configured()
        try:
            response = httpx.post(
                f"{self._base}/storage/v1/object/sign/{bucket}/{path}",
                json={"expiresIn": SIGNED_URL_SECONDS},
                headers=self._headers(),
                timeout=15,
            )
            response.raise_for_status()
            return f"{self._base}/storage/v1{response.json()['signedURL']}"
        except (httpx.HTTPError, KeyError, ValueError):
            return ""  # the page then shows the file name without a link


def get_storage(settings: Settings = Depends(get_settings)) -> Storage:
    return Storage(settings)
