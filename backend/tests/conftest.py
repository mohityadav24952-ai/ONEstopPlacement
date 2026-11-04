import os

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["SUPABASE_URL"] = "https://test.supabase.co"
os.environ["ENVIRONMENT"] = "test"
os.environ["DEV_AUTH_BYPASS"] = "false"  # a developer .env may enable it

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, event  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

import app.db.models  # noqa: E402,F401
from app.core.security import AuthUser, get_current_user  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.main import create_app  # noqa: E402
from app.shared.storage import LocalStorage, get_storage  # noqa: E402


@pytest.fixture(autouse=True)
def _reset_rate_limits():
    from app.core import ratelimit

    ratelimit.reset()
    yield


@pytest.fixture()
def session_factory():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )

    @event.listens_for(engine, "connect")
    def _fk(conn, _):  # enforce FK cascades like Postgres does
        conn.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


@pytest.fixture()
def app(session_factory, tmp_path):
    application = create_app()
    application.dependency_overrides[get_storage] = lambda: LocalStorage(tmp_path / "files")

    def _db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    application.dependency_overrides[get_db] = _db
    return application


class Client:
    """Test client that can switch which user is signed in."""

    def __init__(self, app):
        self.app = app
        self.http = TestClient(app, raise_server_exceptions=False)
        self.as_user("user-a")

    def as_user(self, sub: str):
        self.app.dependency_overrides[get_current_user] = lambda: AuthUser(
            id=sub, email=f"{sub}@example.com"
        )
        return self


@pytest.fixture()
def client(app):
    return Client(app)
