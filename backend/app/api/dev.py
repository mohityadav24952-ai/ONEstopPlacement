from fastapi import APIRouter, Query

from app.core.errors import AppError

router = APIRouter(prefix="/dev", tags=["dev (development only)"])


@router.get("/limit")
def limit(n: int = Query(..., ge=1, le=100)) -> dict[str, int]:
    """Validation demo: n must be an integer from 1 to 100."""
    return {"n": n}


@router.get("/conflict")
def conflict() -> None:
    """AppError demo."""
    raise AppError("DEMO_CONFLICT", "This is a demo of a deliberate error.", 409)


@router.get("/boom")
def boom() -> None:
    """Unexpected-crash demo."""
    raise RuntimeError("Deliberate test failure")