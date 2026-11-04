import datetime as dt
import uuid

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models.mixins import IdMixin, TimestampMixin, utcnow


def _profile_fk() -> Mapped[uuid.UUID]:
    return mapped_column(sa.ForeignKey("student_profiles.id", ondelete="CASCADE"), index=True)


class Portfolio(IdMixin, TimestampMixin, Base):
    __tablename__ = "portfolios"
    __table_args__ = (sa.UniqueConstraint("profile_id", "slug"),)
    profile_id: Mapped[uuid.UUID] = _profile_fk()
    title: Mapped[str] = mapped_column(sa.String(120))
    slug: Mapped[str] = mapped_column(sa.String(80))
    selected_theme_id: Mapped[str] = mapped_column(sa.String(30), default="minimal")


class PortfolioVersion(IdMixin, TimestampMixin, Base):
    __tablename__ = "portfolio_versions"
    portfolio_id: Mapped[uuid.UUID] = mapped_column(
        sa.ForeignKey("portfolios.id", ondelete="CASCADE"), index=True
    )
    profile_id: Mapped[uuid.UUID] = _profile_fk()
    content: Mapped[dict] = mapped_column(sa.JSON)
    theme_id: Mapped[str] = mapped_column(sa.String(30))
    theme_options: Mapped[dict] = mapped_column(sa.JSON, default=dict)
    status: Mapped[str] = mapped_column(sa.String(12), default="DRAFT")  # DRAFT | APPROVED
    approved_at: Mapped[dt.datetime | None] = mapped_column(sa.DateTime(timezone=True))
    profile_version_hash: Mapped[str] = mapped_column(sa.String(64))
    validation_report: Mapped[dict | None] = mapped_column(sa.JSON)
    export_storage_key: Mapped[str | None] = mapped_column(sa.String(200))


class ConsentRecord(IdMixin, Base):
    __tablename__ = "consent_records"
    profile_id: Mapped[uuid.UUID] = _profile_fk()
    scope: Mapped[str] = mapped_column(sa.String(40))  # PUBLISH_PORTFOLIO, ...
    summary_hash: Mapped[str] = mapped_column(sa.String(64))
    granted_at: Mapped[dt.datetime] = mapped_column(sa.DateTime(timezone=True), default=utcnow)
    revoked_at: Mapped[dt.datetime | None] = mapped_column(sa.DateTime(timezone=True))


class DeploymentRecord(IdMixin, Base):
    __tablename__ = "deployment_records"
    profile_id: Mapped[uuid.UUID] = _profile_fk()
    portfolio_version_id: Mapped[uuid.UUID] = mapped_column(
        sa.ForeignKey("portfolio_versions.id", ondelete="CASCADE"), index=True
    )
    target: Mapped[str] = mapped_column(sa.String(10))  # ZIP | GITHUB | VERCEL
    status: Mapped[str] = mapped_column(sa.String(12))
    error_code: Mapped[str | None] = mapped_column(sa.String(40))
    started_at: Mapped[dt.datetime] = mapped_column(sa.DateTime(timezone=True), default=utcnow)
    finished_at: Mapped[dt.datetime | None] = mapped_column(sa.DateTime(timezone=True))
    consent_id: Mapped[uuid.UUID | None] = mapped_column(
        sa.ForeignKey("consent_records.id", ondelete="SET NULL")
    )
