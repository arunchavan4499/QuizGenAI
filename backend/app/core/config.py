import os


def use_db_leaderboard() -> bool:
    """Enable DB-backed leaderboard when explicitly configured."""
    return os.getenv("USE_DB_LEADERBOARD", "false").lower() in {"1", "true", "yes"}
