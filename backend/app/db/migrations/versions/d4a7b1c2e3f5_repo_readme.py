"""repository README text (GitHub project understanding)

Revision ID: d4a7b1c2e3f5
Revises: c3d8e5a1b9f4
Create Date: 2026-11-06 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd4a7b1c2e3f5'
down_revision: Union[str, Sequence[str], None] = 'c3d8e5a1b9f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('repositories', sa.Column('readme', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('repositories', 'readme')
