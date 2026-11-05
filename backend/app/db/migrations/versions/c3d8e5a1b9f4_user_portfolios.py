"""user_portfolios table (Portfolio Site Builder)

Revision ID: c3d8e5a1b9f4
Revises: b7c2d4e9f1a3
Create Date: 2026-11-06 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c3d8e5a1b9f4'
down_revision: Union[str, Sequence[str], None] = 'b7c2d4e9f1a3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'user_portfolios',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('handle', sa.String(length=50), nullable=False),
        sa.Column('template_id', sa.String(length=30), nullable=False),
        sa.Column('theme_mode', sa.String(length=15), nullable=False),
        sa.Column('mascot_id', sa.String(length=30), nullable=False),
        sa.Column('accent_color', sa.String(length=20), nullable=False),
        sa.Column('show_coding_stats', sa.Boolean(), nullable=False),
        sa.Column('show_mascot', sa.Boolean(), nullable=False),
        sa.Column('is_published', sa.Boolean(), nullable=False),
        sa.Column('views_count', sa.Integer(), nullable=False),
        sa.Column('portfolio_data', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
    )
    op.create_index(op.f('ix_user_portfolios_handle'), 'user_portfolios', ['handle'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_user_portfolios_handle'), table_name='user_portfolios')
    op.drop_table('user_portfolios')
