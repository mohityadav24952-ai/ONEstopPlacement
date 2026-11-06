"""Small in-memory sliding-window limiter, keyed per signed-in user.

Limits abuse of uploads, AI calls and exports. It is per process, so with several
workers each one counts separately; use a shared store (e.g. Redis) when scaling out.
"""
import datetime as dt
import time
from collections import defaultdict, deque

from fastapi import Depends, Request

from app.core.config import get_settings
from app.core.errors import AppError
from app.core.security import AuthUser, get_current_user

_hits: dict[tuple[str, str], deque[float]] = defaultdict(deque)


def reset() -> None:
    _hits.clear()
    _daily.clear()


def limit(name: str, max_calls: int, per_seconds: int):
    def dependency(user: AuthUser = Depends(get_current_user)) -> None:
        now = time.monotonic()
        window = _hits[(name, user.id)]
        while window and now - window[0] > per_seconds:
            window.popleft()
        if len(window) >= max_calls:
            retry = int(per_seconds - (now - window[0])) + 1
            raise AppError(
                "RATE_LIMITED",
                "You are doing that too often. Please wait a moment and try again.",
                429,
                {"retry_after_seconds": retry},
            )
        window.append(now)

    return dependency


# ---- per-IP daily quota ------------------------------------------------------------------------------
# Same caveat as above: in memory and per process. Counts reset at UTC midnight and on restart.
_daily: dict[tuple[str, str, str], int] = {}


def client_ip(request: Request) -> str:
    """The caller's IP. X-Forwarded-For is honoured only when TRUST_FORWARDED_FOR is set, because
    without a trusted proxy in front any client can write that header."""
    if get_settings().trust_forwarded_for:
        forwarded = request.headers.get("x-forwarded-for", "")
        first = forwarded.split(",")[0].strip()
        if first:
            return first
    return request.client.host if request.client else "unknown"


def daily_used(name: str, key: str) -> int:
    return _daily.get((name, key, dt.datetime.now(dt.timezone.utc).date().isoformat()), 0)


def take_daily(name: str, key: str, max_calls: int) -> bool:
    """Use one of `max_calls` for today. False (and nothing used) when today's quota is spent."""
    today = dt.datetime.now(dt.timezone.utc).date().isoformat()
    for old in [k for k in _daily if k[2] != today]:  # forget earlier days so memory stays small
        del _daily[old]
    slot = (name, key, today)
    if _daily.get(slot, 0) >= max_calls:
        return False
    _daily[slot] = _daily.get(slot, 0) + 1
    return True


def give_back_daily(name: str, key: str) -> None:
    """Refund a call that never reached the provider (e.g. it failed before any tokens were used)."""
    slot = (name, key, dt.datetime.now(dt.timezone.utc).date().isoformat())
    if _daily.get(slot, 0) > 0:
        _daily[slot] -= 1
