import logging

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app import __version__
from app.core.config import get_settings
from app.core.errors import AppError
from app.db.session import get_db

logger = logging.getLogger("app.health")
router = APIRouter(tags=["system"])


@router.get("/health")
def health() -> dict[str, str]:
    settings = get_settings()
    return {
        "status": "ok",
        "service": settings.app_name,
        "environment": settings.environment,
        "version": __version__,
    }


@router.get("/health/ready")
def ready(db: Session = Depends(get_db)) -> dict[str, str]:
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        # Log only the error type. Never log connection details.
        logger.warning("Database readiness check failed: %s", type(exc).__name__)
        raise AppError("DB_UNAVAILABLE", "The database is not reachable.", 503) from None
    return {"status": "ready", "database": "ok"}