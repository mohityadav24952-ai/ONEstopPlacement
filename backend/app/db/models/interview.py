import datetime as dt
import uuid

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models.mixins import IdMixin, TimestampMixin, utcnow


class InterviewQuestion(IdMixin, TimestampMixin, Base):
    """Question bank row. owner_profile_id is NULL for the shared curated bank and set
    for user-specific rows (AI-generated or built from the user's own projects)."""

    __tablename__ = "interview_questions"
    owner_profile_id: Mapped[uuid.UUID | None] = mapped_column(
        sa.ForeignKey("student_profiles.id", ondelete="CASCADE"), index=True
    )
    text: Mapped[str] = mapped_column(sa.Text)
    text_hash: Mapped[str] = mapped_column(sa.String(64), index=True)
    topic: Mapped[str] = mapped_column(sa.String(20), index=True)
    subtopic: Mapped[str | None] = mapped_column(sa.String(60))
    difficulty: Mapped[str] = mapped_column(sa.String(10))
    # OFFICIAL | CANDIDATE_REPORTED | CURATED | AI_GENERATED | UNKNOWN
    provenance_type: Mapped[str] = mapped_column(sa.String(20))
    company: Mapped[str | None] = mapped_column(sa.String(200))
    role_tags: Mapped[list] = mapped_column(sa.JSON, default=list)
    status: Mapped[str] = mapped_column(sa.String(10), default="ACTIVE")


class QuestionSource(IdMixin, Base):
    __tablename__ = "question_sources"
    question_id: Mapped[uuid.UUID] = mapped_column(
        sa.ForeignKey("interview_questions.id", ondelete="CASCADE"), index=True
    )
    source_url: Mapped[str | None] = mapped_column(sa.String(500))
    source_type: Mapped[str] = mapped_column(sa.String(20))
    title: Mapped[str | None] = mapped_column(sa.String(200))
    retrieved_at: Mapped[dt.datetime | None] = mapped_column(sa.DateTime(timezone=True))
    license_note: Mapped[str | None] = mapped_column(sa.String(300))
    reliability_note: Mapped[str | None] = mapped_column(sa.String(300))


class PreparationSession(IdMixin, TimestampMixin, Base):
    __tablename__ = "preparation_sessions"
    profile_id: Mapped[uuid.UUID] = mapped_column(
        sa.ForeignKey("student_profiles.id", ondelete="CASCADE"), index=True
    )
    company: Mapped[str] = mapped_column(sa.String(200))
    role: Mapped[str] = mapped_column(sa.String(200))
    level: Mapped[str | None] = mapped_column(sa.String(50))
    stage: Mapped[str | None] = mapped_column(sa.String(50))
    duration_days: Mapped[int] = mapped_column(sa.Integer)
    jd_id: Mapped[uuid.UUID | None] = mapped_column(
        sa.ForeignKey("job_descriptions.id", ondelete="SET NULL")
    )
    plan: Mapped[dict] = mapped_column(sa.JSON)
    status: Mapped[str] = mapped_column(sa.String(10), default="ACTIVE")


class SessionQuestion(IdMixin, Base):
    __tablename__ = "session_questions"
    __table_args__ = (sa.UniqueConstraint("session_id", "question_id"),)
    session_id: Mapped[uuid.UUID] = mapped_column(
        sa.ForeignKey("preparation_sessions.id", ondelete="CASCADE"), index=True
    )
    question_id: Mapped[uuid.UUID] = mapped_column(
        sa.ForeignKey("interview_questions.id", ondelete="CASCADE")
    )
    state: Mapped[str] = mapped_column(sa.String(10), default="TODO")
    notes: Mapped[str | None] = mapped_column(sa.Text)
    updated_at: Mapped[dt.datetime] = mapped_column(
        sa.DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class QuestionReport(IdMixin, Base):
    __tablename__ = "question_reports"
    question_id: Mapped[uuid.UUID] = mapped_column(
        sa.ForeignKey("interview_questions.id", ondelete="CASCADE"), index=True
    )
    profile_id: Mapped[uuid.UUID] = mapped_column(
        sa.ForeignKey("student_profiles.id", ondelete="CASCADE"), index=True
    )
    reason: Mapped[str] = mapped_column(sa.String(500))
    created_at: Mapped[dt.datetime] = mapped_column(sa.DateTime(timezone=True), default=utcnow)
