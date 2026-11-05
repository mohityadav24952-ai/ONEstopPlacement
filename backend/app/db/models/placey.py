import datetime as dt

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models.mixins import IdMixin, utcnow


class PlaceyCache(IdMixin, Base):
    """Answers that "Ask Placey" has already generated, so asking again costs nothing.

    Shared by all users on purpose: the key is the question text (plus the company for behavioural
    guidance), and nothing personal is ever stored here. Only real model output is cached, never
    the demo-mode placeholder and never a failure.
    """

    __tablename__ = "placey_cache"

    cache_key: Mapped[str] = mapped_column(sa.String(64), unique=True, index=True)  # sha256 of kind + normalised text (+ company)
    kind: Mapped[str] = mapped_column(sa.String(12))  # answer | guidance
    question_text: Mapped[str] = mapped_column(sa.Text)
    company: Mapped[str | None] = mapped_column(sa.String(120), nullable=True)
    payload: Mapped[dict] = mapped_column(sa.JSON)
    model_id: Mapped[str] = mapped_column(sa.String(80), default="")
    grounded: Mapped[bool] = mapped_column(sa.Boolean, default=False)  # True when web search results backed it
    hits: Mapped[int] = mapped_column(sa.Integer, default=0)
    created_at: Mapped[dt.datetime] = mapped_column(sa.DateTime(timezone=True), default=utcnow, server_default=sa.func.now())
    last_hit_at: Mapped[dt.datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
