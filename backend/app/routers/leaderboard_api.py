from fastapi import APIRouter, Query

from app import deps
from app.schemas import DifficultyLevel, LeaderboardResponse
from app.services.leaderboard_service import get_leaderboard, get_overall_leaderboard

router = APIRouter()


@router.get("/overall", response_model=LeaderboardResponse)
def overall_leaderboard(current_user: deps.CurrentUser, limit: int = Query(default=10, ge=1, le=100)) -> LeaderboardResponse:
    return get_overall_leaderboard(limit=limit)


@router.get("/{difficulty}", response_model=LeaderboardResponse)
def leaderboard_by_difficulty(current_user: deps.CurrentUser, difficulty: DifficultyLevel, limit: int = Query(default=10, ge=1, le=100)) -> LeaderboardResponse:
    return get_leaderboard(difficulty=difficulty, limit=limit)
