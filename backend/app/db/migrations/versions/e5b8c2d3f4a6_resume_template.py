"""resume_versions.template_id

Revision ID: e5b8c2d3f4a6
Revises: d4a7b1c2e3f5
Create Date: 2026-11-06 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e5b8c2d3f4a6'
down_revision: Union[str, Sequence[str], None] = 'd4a7b1c2e3f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('resume_versions', sa.Column('template_id', sa.String(length=20), nullable=True))


def downgrade() -> None:
    op.drop_column('resume_versions', 'template_id')
