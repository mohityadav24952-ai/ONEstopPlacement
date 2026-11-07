"""Process-wide cache of GitHub data, shared by the Coding connector and Portfolio enrichment.

One fetch of a username serves every module for an hour, so a student moving between Coding,
Resume Studio and Portfolio does not spend GitHub's rate limit again. Entries older than the TTL are
not served normally, but are kept as a last resort when GitHub itself is rate limiting us.

In-memory and per process: it resets on restart and is not shared between workers, which is fine for
a cache (the database snapshot stays the source of truth).
"""
import copy
import threading
import time
from typing import Any

TTL_SECONDS = 60 * 60          # fresh for 1 hour
STALE_MAX_SECONDS = 24 * 3600  # stale copies are only used when GitHub refuses us
MAX_ENTRIES = 2000

_lock = threading.Lock()
_store: dict[tuple[str, str], tuple[float, Any]] = {}


def _key(kind: str, username: str) -> tuple[str, str]:
    return kind, username.strip().lower()


def get(kind: str, username: str, allow_stale: bool = False) -> Any | None:
    """A deep copy of the cached value, or None. Callers may freely mutate what they get."""
    with _lock:
        hit = _store.get(_key(kind, username))
    if hit is None:
        return None
    age = time.monotonic() - hit[0]
    if age > (STALE_MAX_SECONDS if allow_stale else TTL_SECONDS):
        return None
    return copy.deepcopy(hit[1])


def put(kind: str, username: str, value: Any) -> None:
    with _lock:
        if len(_store) >= MAX_ENTRIES:
            # Drop the oldest entry; simple and bounded.
            oldest = min(_store, key=lambda k: _store[k][0])
            _store.pop(oldest, None)
        _store[_key(kind, username)] = (time.monotonic(), copy.deepcopy(value))


def clear() -> None:
    with _lock:
        _store.clear()
