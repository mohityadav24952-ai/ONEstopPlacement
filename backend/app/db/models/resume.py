import datetime as dt
import uuid

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models.mixins import IdMixin, TimestampMixin, utcnow


def _profile_fk() -> Mapped[uuid.UUID]:
    return mapped_column(sa.ForeignKey("student_profiles.id", ondelete="CASCADE"), index=True)


class AIRun(IdMixin, Base):
    """Audit row for every model call. Never stores prompt or response text."""

    __tablename__ = "ai_runs"
    profile_id: Mapped[uuid.UUID] = _profile_fk()
    workflow: Mapped[str] = mapped_column(sa.String(40))
    prompt_version: Mapped[str] = mapped_column(sa.String(40))
    provider: Mapped[str] = mapped_column(sa.String(20))
    model_id: Mapped[str] = mapped_column(sa.String(80))
    input_hash: Mapped[str] = mapped_column(sa.String(64))
    tokens_in: Mapped[int] = mapped_column(sa.Integer, default=0)
    tokens_out: Mapped[int] = mapped_column(sa.Integer, default=0)
    latency_ms: Mapped[int] = mapped_column(sa.Integer, default=0)
    status: Mapped[str] = mapped_column(sa.String(12))  # OK | FAILED
    failure_category: Mapped[str | None] = mapped_column(sa.String(30))
    created_at: Mapped[dt.datetime] = mapped_column(sa.DateTime(timezone=True), default=utcnow)


class ResumeDocument(IdMixin, TimestampMixin, Base):
    __tablename__ = "resume_documents"
    __table_args__ = (sa.UniqueConstraint("profile_id", "sha256"),)
    profile_id: Mapped[uuid.UUID] = _profile_fk()
    storage_key: Mapped[str] = mapped_column(sa.String(200))
    text_storage_key: Mapped[str] = mapped_column(sa.String(200))
    original_name: Mapped[str] = mapped_column(sa.String(200))
    mime_type: Mapped[str] = mapped_column(sa.String(100))
    size: Mapped[int] = mapped_column(sa.Integer)
    sha256: Mapped[str] = mapped_column(sa.String(64))
    page_count: Mapped[int | None] = mapped_column(sa.Integer)
    parse_status: Mapped[str] = mapped_column(sa.String(20), default="UPLOADED")
    parsed: Mapped[dict | None] = mapped_column(sa.JSON)


class JobDescription(IdMixin, TimestampMixin, Base):
    __tablename__ = "job_descriptions"
    __table_args__ = (sa.UniqueConstraint("profile_id", "text_hash"),)
    profile_id: Mapped[uuid.UUID] = _profile_fk()
    company: Mapped[str | None] = mapped_column(sa.String(200))
    role_title: Mapped[str | None] = mapped_column(sa.String(200))
    level: Mapped[str | None] = mapped_column(sa.String(50))
    text: Mapped[str] = mapped_column(sa.Text)
    text_hash: Mapped[str] = mapped_column(sa.String(64))
    source_url: Mapped[str | None] = mapped_column(sa.String(500))


class ResumeAnalysis(IdMixin, TimestampMixin, Base):
    __tablename__ = "resume_analyses"
    profile_id: Mapped[uuid.UUID] = _profile_fk()
    jd_id: Mapped[uuid.UUID] = mapped_column(
        sa.ForeignKey("job_descriptions.id", ondelete="CASCADE"), index=True
    )
    profile_version_hash: Mapped[str] = mapped_column(sa.String(64))
    requirements: Mapped[list] = mapped_column(sa.JSON, default=list)
    matches: Mapped[list] = mapped_column(sa.JSON, default=list)
    jd_quality: Mapped[str] = mapped_column(sa.String(10), default="ok")


class ResumeVersion(IdMixin, TimestampMixin, Base):
    __tablename__ = "resume_versions"
    profile_id: Mapped[uuid.UUID] = _profile_fk()
    parent_version_id: Mapped[uuid.UUID | None] = mapped_column(
        sa.ForeignKey("resume_versions.id", ondelete="SET NULL")
    )
    jd_id: Mapped[uuid.UUID | None] = mapped_column(
        sa.ForeignKey("job_descriptions.id", ondelete="SET NULL")
    )
    analysis_id: Mapped[uuid.UUID | None] = mapped_column(sa.Uuid)
    title: Mapped[str] = mapped_column(sa.String(200), default="Resume")
    status: Mapped[str] = mapped_column(sa.String(12), default="DRAFT")  # DRAFT | APPROVED
    schema_version: Mapped[int] = mapped_column(sa.Integer, default=1)
    content: Mapped[dict] = mapped_column(sa.JSON)
    change_list: Mapped[list] = mapped_column(sa.JSON, default=list)
    claim_flags: Mapped[list] = mapped_column(sa.JSON, default=list)
    profile_version_hash: Mapped[str] = mapped_column(sa.String(64))
    approved_at: Mapped[dt.datetime | None] = mapped_column(sa.DateTime(timezone=True))
    pdf_storage_key: Mapped[str | None] = mapped_column(sa.String(200))
    template_id: Mapped[str | None] = mapped_column(sa.String(20))  # template of the last exported PDF
