from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api import dev, health, v1
from app.core.config import get_settings
from app.core.errors import register_error_handlers
from app.core.logging import configure_logging
from app.core.middleware import request_context_middleware


def _init_dev_database() -> None:
    from app.db.base import Base
    from app.db.session import get_engine
    import app.db.models  # noqa: F401  (registers every table)

    Base.metadata.create_all(get_engine())


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.log_level)

    if settings.dev_auth_bypass:
        if settings.environment != "development":
            raise RuntimeError("DEV_AUTH_BYPASS is only allowed when ENVIRONMENT=development")
        import logging

        logging.getLogger("app").warning(
            "DEV AUTH BYPASS IS ON: authentication is disabled and a local SQLite file (dev.db) is used."
        )
        _init_dev_database()

    is_production = settings.environment == "production"
    app = FastAPI(
        title=settings.app_name,
        version=__version__,
        docs_url=None if is_production else "/docs",
        redoc_url=None,
        openapi_url=None if is_production else "/openapi.json",
    )

    register_error_handlers(app)

    # Order matters: the last middleware added is the outermost one.
    app.middleware("http")(request_context_middleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
        expose_headers=["X-Request-ID"],
    )

    app.include_router(health.router)
    app.include_router(v1.router)
    if settings.environment == "development":
        app.include_router(dev.router)

    return app


app = create_app()