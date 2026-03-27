"""add profile fields to users

Revision ID: 20260327_02
Revises: 20260326_01
Create Date: 2026-03-27
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260327_02"
down_revision: Union[str, Sequence[str], None] = "20260326_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("phone", sa.String(length=32), nullable=True))
    op.add_column("users", sa.Column("location", sa.String(length=160), nullable=True))
    op.add_column("users", sa.Column("class_year", sa.String(length=120), nullable=True))
    op.add_column("users", sa.Column("bio", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("photo_url", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "photo_url")
    op.drop_column("users", "bio")
    op.drop_column("users", "class_year")
    op.drop_column("users", "location")
    op.drop_column("users", "phone")
