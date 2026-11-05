import datetime as dt
import uuid

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models.mixins import IdMixin, TimestampMixin


class CodingPlatformAccount(IdMixin, TimestampMixin, Base):
    __tablename__ = "coding_accounts"
    __table_args__ = (sa.UniqueConstraint("profile_id", "platform"),)

    profile_id: Mapped[uuid.UUID] = mapped_column(
        sa.ForeignKey("student_profiles.id", ondelete="CASCADE"), index=True
    )
    platform: Mapped[str] = mapped_column(sa.String(20))
    username: Mapped[str] = mapped_column(sa.String(100))
    connection_method: Mapped[str] = mapped_column(sa.String(20))  # API | MANUAL
    status: Mapped[str] = mapped_column(sa.String(20), default="OK")
    last_synced_at: Mapped[dt.datetime | None] = mapped_column(sa.DateTime(timezone=True))
    last_refresh_attempt_at: Mapped[dt.datetime | None] = mapped_column(
        sa.DateTime(timezone=True)
    )


class CodingPlatformSnapshot(IdMixin, Base):
    __tablename__ = "coding_snapshots"

    account_id: Mapped[uuid.UUID] = mapped_column(
        sa.ForeignKey("coding_accounts.id", ondelete="CASCADE"), index=True
    )
    fetched_at: Mapped[dt.datetime] = mapped_column(sa.DateTime(timezone=True))
    source_method: Mapped[str] = mapped_column(sa.String(20))
    status: Mapped[str] = mapped_column(sa.String(20))
    raw_payload: Mapped[dict | None] = mapped_column(sa.JSON)
    normalized: Mapped[dict] = mapped_column(sa.JSON)
    error_code: Mapped[str | None] = mapped_column(sa.String(40))
    is_manual: Mapped[bool] = mapped_column(sa.Boolean, default=False)


class Repository(IdMixin, TimestampMixin, Base):
    __tablename__ = "repositories"
    __table_args__ = (sa.UniqueConstraint("profile_id", "external_id"),)

    profile_id: Mapped[uuid.UUID] = mapped_column(
        sa.ForeignKey("student_profiles.id", ondelete="CASCADE"), index=True
    )
    external_id: Mapped[str] = mapped_column(sa.String(40))
    full_name: Mapped[str] = mapped_column(sa.String(200))
    description: Mapped[str | None] = mapped_column(sa.Text)
    url: Mapped[str] = mapped_column(sa.String(500))
    language: Mapped[str | None] = mapped_column(sa.String(60))
    stars: Mapped[int] = mapped_column(sa.Integer, default=0)
    topics: Mapped[list] = mapped_column(sa.JSON, default=list)
    pushed_at: Mapped[dt.datetime | None] = mapped_column(sa.DateTime(timezone=True))
    is_fork: Mapped[bool] = mapped_column(sa.Boolean, default=False)
    is_archived: Mapped[bool] = mapped_column(sa.Boolean, default=False)
    # Raw README text (capped at 6000 chars) so the AI can understand what the project is about.
    readme: Mapped[str | None] = mapped_column(sa.Text)
    fetched_at: Mapped[dt.datetime] = mapped_column(sa.DateTime(timezone=True))
