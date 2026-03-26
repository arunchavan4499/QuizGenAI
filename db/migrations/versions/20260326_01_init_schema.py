"""create initial hire4thon schema

Revision ID: 20260326_01
Revises:
Create Date: 2026-03-26
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260326_01"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(length=512), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )

    op.create_table(
        "quiz_beginner",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.String(length=64), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("time_started", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("time_taken_seconds", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("marks", sa.Float(), nullable=False, server_default="0"),
        sa.Column("total_marks", sa.Float(), nullable=False, server_default="100"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_quiz_beginner_user_id", "quiz_beginner", ["user_id"])
    op.create_index("ix_quiz_beginner_marks", "quiz_beginner", ["marks"])

    op.create_table(
        "quiz_intermediate",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.String(length=64), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("time_started", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("time_taken_seconds", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("marks", sa.Float(), nullable=False, server_default="0"),
        sa.Column("total_marks", sa.Float(), nullable=False, server_default="100"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_quiz_intermediate_user_id", "quiz_intermediate", ["user_id"])
    op.create_index("ix_quiz_intermediate_marks", "quiz_intermediate", ["marks"])

    op.create_table(
        "quiz_advanced",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.String(length=64), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("time_started", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("time_taken_seconds", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("marks", sa.Float(), nullable=False, server_default="0"),
        sa.Column("total_marks", sa.Float(), nullable=False, server_default="100"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_quiz_advanced_user_id", "quiz_advanced", ["user_id"])
    op.create_index("ix_quiz_advanced_marks", "quiz_advanced", ["marks"])

    op.create_table(
        "quiz_overall",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.String(length=64), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("time_started", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("time_taken_seconds", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("marks", sa.Float(), nullable=False, server_default="0"),
        sa.Column("insights", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_quiz_overall_user_id", "quiz_overall", ["user_id"])
    op.create_index("ix_quiz_overall_marks", "quiz_overall", ["marks"])

    op.create_table(
        "auth_tokens",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.String(length=64), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.UniqueConstraint("token", name="uq_auth_tokens_token"),
    )
    op.create_index("ix_auth_tokens_user_id", "auth_tokens", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_auth_tokens_user_id", table_name="auth_tokens")
    op.drop_table("auth_tokens")

    op.drop_index("ix_quiz_overall_marks", table_name="quiz_overall")
    op.drop_index("ix_quiz_overall_user_id", table_name="quiz_overall")
    op.drop_table("quiz_overall")

    op.drop_index("ix_quiz_advanced_marks", table_name="quiz_advanced")
    op.drop_index("ix_quiz_advanced_user_id", table_name="quiz_advanced")
    op.drop_table("quiz_advanced")

    op.drop_index("ix_quiz_intermediate_marks", table_name="quiz_intermediate")
    op.drop_index("ix_quiz_intermediate_user_id", table_name="quiz_intermediate")
    op.drop_table("quiz_intermediate")

    op.drop_index("ix_quiz_beginner_marks", table_name="quiz_beginner")
    op.drop_index("ix_quiz_beginner_user_id", table_name="quiz_beginner")
    op.drop_table("quiz_beginner")

    op.drop_table("users")
