"""File storage behind a small interface: a private Supabase Storage bucket, or local disk in development."""
import uuid
from functools import lru_cache
from pathlib import Path
from typing import Protocol
from urllib.parse import quote

import httpx

from app.core.config import get_settings
from app.core.errors import AppError


class Storage(Protocol):
    def put(self, prefix: str, data: bytes, suffix: str = "") -> str: ...
    def get(self, key: str) -> bytes: ...
    def delete(self, key: str) -> None: ...


class LocalStorage:
    """Keys are server-generated (prefix/uuid.suffix). User filenames never reach disk."""

    def __init__(self, root: str | Path) -> None:
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        path = (self.root / key).resolve()
        if self.root not in path.parents:  # blocks ../ traversal
            raise ValueError("Invalid storage key")
        return path

    def put(self, prefix: str, data: bytes, suffix: str = "") -> str:
        key = f"{prefix}/{uuid.uuid4().hex}{suffix}"
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return key

    def get(self, key: str) -> bytes:
        return self._path(key).read_bytes()

    def delete(self, key: str) -> None:
        try:
            self._path(key).unlink()
        except FileNotFoundError:
            pass


_CONTENT_TYPES = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".txt": "text/plain; charset=utf-8",
    ".zip": "application/zip",
}


class SupabaseStorage:
    """Private Supabase Storage bucket, used through its REST API with the server-side key.

    The interface matches LocalStorage, so no endpoint changes. Keys are server-generated
    (prefix/uuid.suffix); user filenames never become object names. Access control lives in the API
    (every row is checked against the signed-in user before a key is read), and the bucket stays private.
    """

    def __init__(self, base_url: str, key: str, bucket: str, timeout: float = 30, client: httpx.Client | None = None) -> None:
        self._base = f"{base_url.rstrip('/')}/storage/v1/object"
        self._bucket = bucket
        headers = {"apikey": key}
        if key.count(".") == 2:  # legacy service_role keys are JWTs and also go in Authorization
            headers["Authorization"] = f"Bearer {key}"
        self._client = client or httpx.Client(timeout=timeout)
        self._extra_headers = headers

    def _url(self, key: str) -> str:
        if not key or key.startswith("/") or ".." in key.split("/"):  # blocks ../ traversal
            raise ValueError("Invalid storage key")
        return f"{self._base}/{self._bucket}/{quote(key, safe='/')}"

    def _send(self, method: str, url: str, headers: dict[str, str] | None = None, **kwargs) -> httpx.Response:
        try:
            return self._client.request(method, url, headers={**self._extra_headers, **(headers or {})}, **kwargs)
        except httpx.HTTPError:
            raise AppError("STORAGE_UNAVAILABLE", "File storage is not reachable right now. Try again.", 503) from None

    @staticmethod
    def _fail(resp: httpx.Response) -> AppError:
        return AppError("STORAGE_ERROR", "File storage rejected the request.", 502, details={"status": resp.status_code})

    def put(self, prefix: str, data: bytes, suffix: str = "") -> str:
        key = f"{prefix}/{uuid.uuid4().hex}{suffix}"
        resp = self._send(
            "POST", self._url(key), content=data,
            headers={"Content-Type": _CONTENT_TYPES.get(suffix, "application/octet-stream"), "x-upsert": "false"},
        )
        if resp.status_code >= 400:
            raise self._fail(resp)
        return key

    def get(self, key: str) -> bytes:
        resp = self._send("GET", self._url(key))
        if resp.status_code in (400, 404):  # Supabase answers a missing object with 400 or 404
            raise FileNotFoundError(key)
        if resp.status_code >= 400:
            raise self._fail(resp)
        return resp.content

    def delete(self, key: str) -> None:
        resp = self._send("DELETE", self._url(key))
        if resp.status_code in (400, 404):  # already gone
            return
        if resp.status_code >= 400:
            raise self._fail(resp)


@lru_cache
def _supabase_storage(url: str, key: str, bucket: str, timeout: int) -> SupabaseStorage:
    return SupabaseStorage(url, key, bucket, timeout)


def get_storage() -> Storage:
    """FastAPI dependency. Tests override it."""
    s = get_settings()
    if s.supabase_service_role_key:
        if not s.supabase_url:
            raise AppError("STORAGE_NOT_CONFIGURED", "File storage is not configured.", 503)
        return _supabase_storage(s.supabase_url, s.supabase_service_role_key, s.supabase_storage_bucket, s.storage_timeout_seconds)
    if s.environment != "development":
        raise AppError("STORAGE_NOT_CONFIGURED", "File storage is not configured.", 503)
    return LocalStorage(s.storage_dir)
