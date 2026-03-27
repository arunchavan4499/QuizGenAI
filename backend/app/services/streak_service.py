from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.schemas import SubmissionMonthLabel, SubmissionStreakResponse
from db.models import QuizAdvanced, QuizBeginner, QuizIntermediate, QuizOverall

_DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
_MONTHS = [
    SubmissionMonthLabel(label="Sep", col=1),
    SubmissionMonthLabel(label="Oct", col=6),
    SubmissionMonthLabel(label="Nov", col=10),
    SubmissionMonthLabel(label="Dec", col=14),
    SubmissionMonthLabel(label="Jan", col=19),
    SubmissionMonthLabel(label="Feb", col=23),
    SubmissionMonthLabel(label="Mar", col=28),
    SubmissionMonthLabel(label="Apr", col=32),
    SubmissionMonthLabel(label="May", col=36),
    SubmissionMonthLabel(label="Jun", col=41),
    SubmissionMonthLabel(label="Jul", col=45),
    SubmissionMonthLabel(label="Aug", col=49),
]
_HEATMAP_DAYS = 364


def _load_user_activity_counts(db: Session, user_id: int) -> dict[datetime.date, int]:
    db_user_id = str(user_id)
    counts: dict[datetime.date, int] = {}

    for model in (QuizBeginner, QuizIntermediate, QuizAdvanced, QuizOverall):
        rows = db.execute(select(model.created_at).where(model.user_id == db_user_id)).all()
        for row in rows:
            created_at = row[0]
            if created_at is not None:
                activity_day = created_at.date()
                counts[activity_day] = counts.get(activity_day, 0) + 1

    return counts


def _build_levels(activity_counts: dict[datetime.date, int], end_date: datetime.date) -> list[int]:
    # A 52-week x 7-day grid, oldest to newest, compatible with existing frontend heatmap rendering.
    start_date = end_date - timedelta(days=_HEATMAP_DAYS - 1)
    levels: list[int] = []

    for day_index in range(_HEATMAP_DAYS):
        current_date = start_date + timedelta(days=day_index)
        count = activity_counts.get(current_date, 0)
        levels.append(max(0, min(4, count)))

    return levels


def _calculate_current_streak(activity_dates: set[datetime.date], end_date: datetime.date) -> int:
    streak = 0
    cursor = end_date

    while cursor in activity_dates:
        streak += 1
        cursor -= timedelta(days=1)

    return streak


def _recent_active_days(current_streak_days: int) -> list[int]:
    if current_streak_days <= 0:
        return []

    capped = min(current_streak_days, 7)
    return list(range(1, capped + 1))


def get_submission_streak(db: Session, user_id: int) -> SubmissionStreakResponse:
    today = datetime.now().date()
    activity_counts = _load_user_activity_counts(db=db, user_id=user_id)
    activity_dates = set(activity_counts.keys())

    levels = _build_levels(activity_counts=activity_counts, end_date=today)
    current_streak_days = _calculate_current_streak(activity_dates=activity_dates, end_date=today)

    return SubmissionStreakResponse(
        dayLabels=_DAY_LABELS,
        months=_MONTHS,
        levels=levels,
        streakWeeks=current_streak_days // 7,
        currentStreakDays=current_streak_days,
        recentActiveDays=_recent_active_days(current_streak_days),
    )
