"""Compatibility wrapper for legacy imports.

Canonical DB session and metadata now live in db.database.
"""

from db.database import Base, SessionLocal, engine, get_db

__all__ = ["engine", "SessionLocal", "Base", "get_db"]