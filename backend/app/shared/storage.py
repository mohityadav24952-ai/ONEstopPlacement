"""File storage behind a small interface. Local disk for development."""
import uuid
from pathlib import Path
from typing import Protocol

from app.core.config import get_settings


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


def get_storage() -> Storage:
    """FastAPI dependency. Tests override it."""
    return LocalStorage(get_settings().storage_dir)
