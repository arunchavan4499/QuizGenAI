"""Compatibility wrapper for model imports.

Canonical ORM models live in db.models.
"""

from db.database import Base
from db.models import AuthToken, QuizAdvanced, QuizBeginner, QuizIntermediate, QuizOverall, User

__all__ = [
    "Base",
    "User",
    "QuizBeginner",
    "QuizIntermediate",
    "QuizAdvanced",
    "QuizOverall",
    "AuthToken",
]
