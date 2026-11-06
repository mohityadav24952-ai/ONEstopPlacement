"""resume_documents.latex_links (hyperlinks from an optional .tex upload)

Revision ID: a7d1e2f3b4c5
Revises: f6c9d3e4a5b7
Create Date: 2026-11-06 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a7d1e2f3b4c5'
down_revision: Union[str, Sequence[str], None] = 'f6c9d3e4a5b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('resume_documents', sa.Column('latex_links', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('resume_documents', 'latex_links')
