import uuid
from datetime import datetime, timezone

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class IdMixin:
    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), default=utcnow, server_default=sa.func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        default=utcnow,
        onupdate=utcnow,
        server_default=sa.func.now(),
    )


class ProvenanceMixin:
    """Where a profile fact came from and how far it can be trusted (Blueprint 11.2)."""

    source_type: Mapped[str] = mapped_column(sa.String(32), default="USER_ENTERED")
    verification_state: Mapped[str] = mapped_column(sa.String(32), default="UNVERIFIED")
