"""feedbacks: feedback and bug reports from the Settings page

Revision ID: b8e2f4a6c1d9
Revises: a7d1e2f3b4c5
Create Date: 2026-11-07 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b8e2f4a6c1d9'
down_revision: Union[str, Sequence[str], None] = 'a7d1e2f3b4c5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'feedbacks',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('profile_id', sa.Uuid(), nullable=False),
        sa.Column('email', sa.String(length=320), nullable=True),
        sa.Column('kind', sa.String(length=12), nullable=False),
        sa.Column('feedback_text', sa.Text(), nullable=False),
        sa.Column('page', sa.String(length=200), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['profile_id'], ['student_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_feedbacks_profile_id'), 'feedbacks', ['profile_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_feedbacks_profile_id'), table_name='feedbacks')
    op.drop_table('feedbacks')
