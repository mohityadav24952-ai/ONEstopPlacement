"""Small in-memory sliding-window limiter, keyed per signed-in user.

Limits abuse of uploads, AI calls and exports. It is per process, so with several
workers each one counts separately; use a shared store (e.g. Redis) when scaling out.
"""
import time
from collections import defaultdict, deque

from fastapi import Depends

from app.core.errors import AppError
from app.core.security import AuthUser, get_current_user

_hits: dict[tuple[str, str], deque[float]] = defaultdict(deque)


def reset() -> None:
    _hits.clear()


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
