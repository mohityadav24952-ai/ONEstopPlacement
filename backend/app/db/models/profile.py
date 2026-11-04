import uuid
import datetime as dt

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.models.mixins import IdMixin, ProvenanceMixin, TimestampMixin, utcnow


class User(IdMixin, TimestampMixin, Base):
    __tablename__ = "users"

    auth_subject: Mapped[str] = mapped_column(sa.String(64), unique=True, index=True)
    email: Mapped[str | None] = mapped_column(sa.String(320))
    last_login: Mapped[dt.datetime | None] = mapped_column(sa.DateTime(timezone=True))

    profile: Mapped["StudentProfile"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )


class StudentProfile(IdMixin, TimestampMixin, Base):
    __tablename__ = "student_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        sa.ForeignKey("users.id", ondelete="CASCADE"), unique=True
    )
    display_name: Mapped[str | None] = mapped_column(sa.String(120))
    headline: Mapped[str | None] = mapped_column(sa.String(200))
    target_roles: Mapped[list] = mapped_column(sa.JSON, default=list)
    graduation_year: Mapped[int | None] = mapped_column(sa.Integer)
    location_pref: Mapped[str | None] = mapped_column(sa.String(120))
    summary: Mapped[str | None] = mapped_column(sa.Text)
    # Optimistic concurrency: bumped on every successful change to the profile.
    version: Mapped[int] = mapped_column(sa.Integer, default=1)

    user: Mapped[User] = relationship(back_populates="profile")


class _ProfileChild(IdMixin, TimestampMixin, ProvenanceMixin):
    """Shared columns for every user-owned profile section row."""


def _profile_fk() -> Mapped[uuid.UUID]:
    return mapped_column(
        sa.ForeignKey("student_profiles.id", ondelete="CASCADE"), index=True
    )


class Education(_ProfileChild, Base):
    __tablename__ = "education"
    profile_id: Mapped[uuid.UUID] = _profile_fk()
    institution: Mapped[str] = mapped_column(sa.String(200))
    degree: Mapped[str | None] = mapped_column(sa.String(200))
    field: Mapped[str | None] = mapped_column(sa.String(200))
    start_date: Mapped[dt.date | None] = mapped_column(sa.Date)
    end_date: Mapped[dt.date | None] = mapped_column(sa.Date)
    grade: Mapped[str | None] = mapped_column(sa.String(50))


class Experience(_ProfileChild, Base):
    __tablename__ = "experiences"
    profile_id: Mapped[uuid.UUID] = _profile_fk()
    organization: Mapped[str] = mapped_column(sa.String(200))
    title: Mapped[str] = mapped_column(sa.String(200))
    start_date: Mapped[dt.date | None] = mapped_column(sa.Date)
    end_date: Mapped[dt.date | None] = mapped_column(sa.Date)
    description_points: Mapped[list] = mapped_column(sa.JSON, default=list)


class Achievement(_ProfileChild, Base):
    __tablename__ = "achievements"
    profile_id: Mapped[uuid.UUID] = _profile_fk()
    type: Mapped[str] = mapped_column(sa.String(32))
    title: Mapped[str] = mapped_column(sa.String(200))
    issuer: Mapped[str | None] = mapped_column(sa.String(200))
    date: Mapped[dt.date | None] = mapped_column(sa.Date)
    url: Mapped[str | None] = mapped_column(sa.String(500))


class Skill(_ProfileChild, Base):
    __tablename__ = "skills"
    __table_args__ = (sa.UniqueConstraint("profile_id", "normalized_name"),)
    profile_id: Mapped[uuid.UUID] = _profile_fk()
    name: Mapped[str] = mapped_column(sa.String(100))
    normalized_name: Mapped[str] = mapped_column(sa.String(100))
    category: Mapped[str | None] = mapped_column(sa.String(50))
    level: Mapped[str | None] = mapped_column(sa.String(20))


class Project(_ProfileChild, Base):
    __tablename__ = "projects"
    profile_id: Mapped[uuid.UUID] = _profile_fk()
    title: Mapped[str] = mapped_column(sa.String(200))
    description: Mapped[str | None] = mapped_column(sa.Text)
    tech: Mapped[list] = mapped_column(sa.JSON, default=list)
    links: Mapped[list] = mapped_column(sa.JSON, default=list)
    contribution: Mapped[str | None] = mapped_column(sa.Text)
    outcomes: Mapped[list] = mapped_column(sa.JSON, default=list)
    repository_id: Mapped[uuid.UUID | None] = mapped_column(sa.Uuid)


class EvidenceItem(IdMixin, Base):
    __tablename__ = "evidence_items"
    profile_id: Mapped[uuid.UUID] = _profile_fk()
    entity_type: Mapped[str] = mapped_column(sa.String(32))
    entity_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, index=True)
    source_type: Mapped[str] = mapped_column(sa.String(32))
    source_ref: Mapped[str | None] = mapped_column(sa.String(500))
    extracted_claim: Mapped[str | None] = mapped_column(sa.Text)
    created_at: Mapped[dt.datetime] = mapped_column(
        sa.DateTime(timezone=True), default=utcnow
    )


class Proposal(IdMixin, TimestampMixin, Base):
    """A pending change from an automated source. Applied only after approval."""

    __tablename__ = "profile_proposals"
    profile_id: Mapped[uuid.UUID] = _profile_fk()
    section: Mapped[str] = mapped_column(sa.String(32))
    action: Mapped[str] = mapped_column(sa.String(16))  # create | update | delete
    target_id: Mapped[uuid.UUID | None] = mapped_column(sa.Uuid)
    payload: Mapped[dict] = mapped_column(sa.JSON, default=dict)
    base_profile_version: Mapped[int] = mapped_column(sa.Integer)
    source: Mapped[str] = mapped_column(sa.String(32), default="AI_SUGGESTED")
    status: Mapped[str] = mapped_column(sa.String(16), default="PENDING")
    decided_at: Mapped[dt.datetime | None] = mapped_column(sa.DateTime(timezone=True))
