import uuid

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models.mixins import IdMixin, TimestampMixin


class Feedback(IdMixin, TimestampMixin, Base):
    """Feedback and bug reports sent from the Settings page.

    Owned by the profile that sent it, so it is removed with the account (FK cascade) and included in the
    user's data export. `email` is copied from the sign-in token at submit time so a maintainer can reply."""

    __tablename__ = "feedbacks"

    profile_id: Mapped[uuid.UUID] = mapped_column(sa.ForeignKey("student_profiles.id", ondelete="CASCADE"), index=True)
    email: Mapped[str | None] = mapped_column(sa.String(320))
    kind: Mapped[str] = mapped_column(sa.String(12), default="feedback")  # feedback | bug
    feedback_text: Mapped[str] = mapped_column(sa.Text)
    page: Mapped[str | None] = mapped_column(sa.String(200))  # where in the app it was sent from
