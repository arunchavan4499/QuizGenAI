from fastapi import APIRouter

from app import deps
from app.schemas import SubmissionStreakResponse
from app.services.streak_service import get_submission_streak

router = APIRouter()


@router.get("/submission-streak", response_model=SubmissionStreakResponse)
def submission_streak(current_user: deps.CurrentUser, db: deps.DBSession) -> SubmissionStreakResponse:
    return get_submission_streak(db=db, user_id=current_user.id)
