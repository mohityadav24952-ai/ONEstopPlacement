"""intake_requests table (approval queue for data found in a resume)

Revision ID: f6c9d3e4a5b7
Revises: e5b8c2d3f4a6
Create Date: 2026-11-07 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f6c9d3e4a5b7'
down_revision: Union[str, Sequence[str], None] = 'e5b8c2d3f4a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'intake_requests',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('profile_id', sa.Uuid(), nullable=False),
        sa.Column('document_id', sa.Uuid(), nullable=True),
        sa.Column('kind', sa.String(length=24), nullable=False),
        sa.Column('payload', sa.JSON(), nullable=False),
        sa.Column('status', sa.String(length=16), nullable=False),
        sa.Column('message', sa.String(length=300), nullable=True),
        sa.Column('decided_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['profile_id'], ['student_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_intake_requests_profile_id'), 'intake_requests', ['profile_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_intake_requests_profile_id'), table_name='intake_requests')
    op.drop_table('intake_requests')
