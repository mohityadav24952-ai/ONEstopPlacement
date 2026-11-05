"""placey cache table

Revision ID: b7c2d4e9f1a3
Revises: 1e97c850f732
Create Date: 2026-11-05 18:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7c2d4e9f1a3'
down_revision: Union[str, Sequence[str], None] = '1e97c850f732'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'placey_cache',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('cache_key', sa.String(length=64), nullable=False),
        sa.Column('kind', sa.String(length=12), nullable=False),
        sa.Column('question_text', sa.Text(), nullable=False),
        sa.Column('company', sa.String(length=120), nullable=True),
        sa.Column('payload', sa.JSON(), nullable=False),
        sa.Column('model_id', sa.String(length=80), nullable=False),
        sa.Column('grounded', sa.Boolean(), nullable=False),
        sa.Column('hits', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('last_hit_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_placey_cache_cache_key'), 'placey_cache', ['cache_key'], unique=True)
    if op.get_bind().dialect.name == "postgresql":  # deny Data API access (see profile migration)
        op.execute("ALTER TABLE placey_cache ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    op.drop_index(op.f('ix_placey_cache_cache_key'), table_name='placey_cache')
    op.drop_table('placey_cache')
