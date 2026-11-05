import datetime as dt
import uuid

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models.mixins import IdMixin, TimestampMixin


class IntakeRequest(IdMixin, TimestampMixin, Base):
    """Data found in a user's first parsed resume that is waiting for their approval before it is used.

    Resume sections (education, projects, ...) already wait as `profile_proposals`; this table holds the
    kinds that are not profile sections: coding platform accounts and basic profile details. Nothing here
    is applied until the user approves it."""

    __tablename__ = "intake_requests"

    profile_id: Mapped[uuid.UUID] = mapped_column(sa.ForeignKey("student_profiles.id", ondelete="CASCADE"), index=True)
    document_id: Mapped[uuid.UUID | None] = mapped_column(sa.Uuid)
    kind: Mapped[str] = mapped_column(sa.String(24))  # CODING_ACCOUNT | PROFILE_FIELD
    payload: Mapped[dict] = mapped_column(sa.JSON, default=dict)
    status: Mapped[str] = mapped_column(sa.String(16), default="PENDING")  # PENDING | APPROVED | REJECTED | FAILED
    message: Mapped[str | None] = mapped_column(sa.String(300))
    decided_at: Mapped[dt.datetime | None] = mapped_column(sa.DateTime(timezone=True))
