from collections import defaultdict

from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import use_db_leaderboard
from app.schemas import DifficultyLevel, LeaderboardEntry, LeaderboardResponse
from db.database import SessionLocal
from db.models import QuizAdvanced, QuizBeginner, QuizIntermediate, User

_LEADERBOARD_STORAGE: dict[DifficultyLevel, list[LeaderboardEntry]] = defaultdict(list)


def _top_percentages(entries: list[LeaderboardEntry]) -> list[float]:
    if not entries:
        return []
    highest = max(entry.score for entry in entries) or 1.0
    return [round((entry.score / highest) * 100, 2) for entry in entries]


def _quiz_model_for_difficulty(difficulty: DifficultyLevel):
    if difficulty == DifficultyLevel.beginner:
        return QuizBeginner
    if difficulty == DifficultyLevel.intermediate:
        return QuizIntermediate
    return QuizAdvanced


def _parse_numeric_user_id(raw_user_id: str) -> int:
    try:
        return int(raw_user_id)
    except (TypeError, ValueError):
        return 0


def record_score(user_id: int, difficulty: DifficultyLevel, score: float) -> None:
    if use_db_leaderboard():
        model = _quiz_model_for_difficulty(difficulty)
        session = SessionLocal()
        try:
            db_user_id = str(user_id)
            user_exists = session.execute(select(User.id).where(User.id == db_user_id)).scalar_one_or_none()
            if user_exists is None:
                session.add(
                    User(
                        id=db_user_id,
                        name=str(user_id),
                        email=f"{user_id}@placeholder.local",
                        password_hash="argon2_placeholder",
                    )
                )
                session.flush()

            session.add(model(user_id=db_user_id, marks=score, total_marks=100, time_taken_seconds=0))
            session.commit()
            return
        except SQLAlchemyError:
            session.rollback()
        finally:
            session.close()

    _LEADERBOARD_STORAGE[difficulty].append(LeaderboardEntry(user_id=user_id, score=score))


def get_leaderboard(difficulty: DifficultyLevel, limit: int = 10) -> LeaderboardResponse:
    if use_db_leaderboard():
        model = _quiz_model_for_difficulty(difficulty)
        session = SessionLocal()
        try:
            rows = session.execute(
                select(model.user_id, model.marks).order_by(model.marks.desc()).limit(limit)
            ).all()
            entries = [LeaderboardEntry(user_id=_parse_numeric_user_id(row.user_id), score=float(row.marks)) for row in rows]
            return LeaderboardResponse(
                difficulty=difficulty.value,
                entries=entries,
                top_percentages=_top_percentages(entries),
            )
        except SQLAlchemyError:
            pass
        finally:
            session.close()

    entries = sorted(_LEADERBOARD_STORAGE[difficulty], key=lambda item: item.score, reverse=True)
    top_entries = entries[:limit]
    return LeaderboardResponse(
        difficulty=difficulty.value,
        entries=top_entries,
        top_percentages=_top_percentages(top_entries),
    )


def _section_percentages(session: Session, model) -> dict[int, float]:
    rows = session.execute(
        select(
            model.user_id,
            (func.max(model.marks) / func.max(model.total_marks) * 100.0).label("pct"),
        ).group_by(model.user_id)
    ).all()
    return {_parse_numeric_user_id(row.user_id): float(row.pct or 0.0) for row in rows}


def get_overall_leaderboard(limit: int = 10) -> LeaderboardResponse:
    if use_db_leaderboard():
        session = SessionLocal()
        try:
            beginner = _section_percentages(session, QuizBeginner)
            intermediate = _section_percentages(session, QuizIntermediate)
            advanced = _section_percentages(session, QuizAdvanced)

            users = set(beginner) | set(intermediate) | set(advanced)
            combined_entries = []
            for user_id in users:
                overall_score = round(
                    (
                        beginner.get(user_id, 0.0)
                        + intermediate.get(user_id, 0.0)
                        + advanced.get(user_id, 0.0)
                    )
                    / 3.0,
                    2,
                )
                combined_entries.append(LeaderboardEntry(user_id=user_id, score=overall_score))

            combined_entries.sort(key=lambda item: item.score, reverse=True)
            top_entries = combined_entries[:limit]
            return LeaderboardResponse(
                difficulty="overall",
                entries=top_entries,
                top_percentages=_top_percentages(top_entries),
            )
        except SQLAlchemyError:
            pass
        finally:
            session.close()

    merged = []
    users = set()
    for difficulty in (DifficultyLevel.beginner, DifficultyLevel.intermediate, DifficultyLevel.advanced):
        users.update(entry.user_id for entry in _LEADERBOARD_STORAGE[difficulty])

    for user_id in users:
        b = max((e.score for e in _LEADERBOARD_STORAGE[DifficultyLevel.beginner] if e.user_id == user_id), default=0.0)
        i = max((e.score for e in _LEADERBOARD_STORAGE[DifficultyLevel.intermediate] if e.user_id == user_id), default=0.0)
        a = max((e.score for e in _LEADERBOARD_STORAGE[DifficultyLevel.advanced] if e.user_id == user_id), default=0.0)
        merged.append(LeaderboardEntry(user_id=user_id, score=round((b + i + a) / 3.0, 2)))

    merged.sort(key=lambda item: item.score, reverse=True)
    top_entries = merged[:limit]
    return LeaderboardResponse(
        difficulty="overall",
        entries=top_entries,
        top_percentages=_top_percentages(top_entries),
    )
