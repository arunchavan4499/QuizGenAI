"""Compatibility wrapper for legacy imports.

Canonical configuration now lives in db.config.
"""

import os

from db.config import db_url, settings


def use_db_leaderboard() -> bool:
	return os.getenv("USE_DB_LEADERBOARD", "true").lower() in {"1", "true", "yes"}


__all__ = ["settings", "db_url", "use_db_leaderboard"]
