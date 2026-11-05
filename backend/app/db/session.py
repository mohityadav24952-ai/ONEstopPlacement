from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.core.errors import AppError


@lru_cache
def get_engine() -> Engine:
    settings = get_settings()
    url = settings.effective_database_url
    if not url:
        raise AppError("DB_NOT_CONFIGURED", "The database is not configured.", 503)
    if url.startswith("sqlite"):  # dev bypass: local file, tables created on startup
        from sqlalchemy import event
        from sqlalchemy.pool import StaticPool

        if ":memory:" in url or url in ("sqlite://", "sqlite:///"):
            # One shared connection is only safe for a single in-memory database.
            return create_engine(url, connect_args={"check_same_thread": False}, poolclass=StaticPool)

        # A file database needs one connection PER session. Sharing a single connection across the
        # request threadpool made concurrent requests fail with "bad parameter or other API misuse"
        # and could wedge the whole server (the Home page fires several requests at once).
        engine = create_engine(url, connect_args={"check_same_thread": False, "timeout": 15})

        @event.listens_for(engine, "connect")
        def _sqlite_pragmas(dbapi_conn, _record):  # noqa: ANN001
            cur = dbapi_conn.cursor()
            cur.execute("PRAGMA journal_mode=WAL")  # readers do not block the writer
            cur.execute("PRAGMA busy_timeout=15000")
            cur.close()

        return engine
    return create_engine(
        url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=5,
        pool_recycle=1800,
        connect_args={"connect_timeout": 5},
    )


@lru_cache
def get_session_factory() -> sessionmaker[Session]:
    return sessionmaker(bind=get_engine(), autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    db = get_session_factory()()
    try:
        yield db
    finally:
        db.close()