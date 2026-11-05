import uuid

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models.mixins import IdMixin, TimestampMixin


class UserPortfolio(IdMixin, TimestampMixin, Base):
    """One public portfolio website per user (Portfolio Site Builder). Separate from the draft/export
    `portfolio_*` tables: those are untouched."""

    __tablename__ = "user_portfolios"

    user_id: Mapped[uuid.UUID] = mapped_column(sa.ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    handle: Mapped[str] = mapped_column(sa.String(50), unique=True, index=True)
    template_id: Mapped[str] = mapped_column(sa.String(30), default="blueprint")
    theme_mode: Mapped[str] = mapped_column(sa.String(15), default="dark")
    mascot_id: Mapped[str] = mapped_column(sa.String(30), default="cyber-alien")
    accent_color: Mapped[str] = mapped_column(sa.String(20), default="emerald")
    show_coding_stats: Mapped[bool] = mapped_column(sa.Boolean, default=True)
    show_mascot: Mapped[bool] = mapped_column(sa.Boolean, default=True)
    # Private until the owner publishes it: nothing goes public without an explicit action.
    is_published: Mapped[bool] = mapped_column(sa.Boolean, default=False)
    views_count: Mapped[int] = mapped_column(sa.Integer, default=0)
    # Everything except `config` (which lives in the columns above): basics, codingStats, skills, projects, ...
    portfolio_data: Mapped[dict] = mapped_column(sa.JSON, default=dict)
