from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column

from db.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(512), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    location: Mapped[str | None] = mapped_column(String(160), nullable=True)
    class_year: Mapped[str | None] = mapped_column(String(120), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"), nullable=False)


class QuizBeginner(Base):
    __tablename__ = "quiz_beginner"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    time_started: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"), nullable=False)
    time_taken_seconds: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    marks: Mapped[float] = mapped_column(Float, nullable=False, server_default="0")
    total_marks: Mapped[float] = mapped_column(Float, nullable=False, server_default="100")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"), nullable=False)


class QuizIntermediate(Base):
    __tablename__ = "quiz_intermediate"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    time_started: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"), nullable=False)
    time_taken_seconds: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    marks: Mapped[float] = mapped_column(Float, nullable=False, server_default="0")
    total_marks: Mapped[float] = mapped_column(Float, nullable=False, server_default="100")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"), nullable=False)


class QuizAdvanced(Base):
    __tablename__ = "quiz_advanced"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    time_started: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"), nullable=False)
    time_taken_seconds: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    marks: Mapped[float] = mapped_column(Float, nullable=False, server_default="0")
    total_marks: Mapped[float] = mapped_column(Float, nullable=False, server_default="100")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"), nullable=False)


class QuizOverall(Base):
    __tablename__ = "quiz_overall"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    time_started: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"), nullable=False)
    time_taken_seconds: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    marks: Mapped[float] = mapped_column(Float, nullable=False, server_default="0")
    insights: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"), nullable=False)


class AuthToken(Base):
    __tablename__ = "auth_tokens"
    __table_args__ = (UniqueConstraint("token", name="uq_auth_tokens_token"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"), nullable=False)
