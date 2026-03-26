from fastapi import APIRouter, HTTPException

from app.api import deps
from app.models.schemas import (
    GenerateQuizRequest,
    GenerateQuizResponse,
    OverallInsightsRequest,
    OverallInsightsResponse,
    SubmitAnswersRequest,
    SubmitAnswersResponse,
)
from app.services.leaderboard_service import record_score
from app.services.quiz_service import LLMServiceError, generate_overall_insights, generate_quiz, submit_answers

router = APIRouter()


@router.post("/generate", response_model=GenerateQuizResponse)
def generate_quiz_endpoint(payload: GenerateQuizRequest, current_user: deps.CurrentUser) -> GenerateQuizResponse:
    try:
        return generate_quiz(payload)
    except LLMServiceError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/submit", response_model=SubmitAnswersResponse)
def submit_answers_endpoint(payload: SubmitAnswersRequest, current_user: deps.CurrentUser) -> SubmitAnswersResponse:
    try:
        result = submit_answers(payload, current_user.id)
    except LLMServiceError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    record_score(user_id=current_user.id, difficulty=payload.difficulty, score=result.score)
    return result


@router.post("/insights/final", response_model=OverallInsightsResponse)
def final_overall_insights_endpoint(payload: OverallInsightsRequest, current_user: deps.CurrentUser) -> OverallInsightsResponse:
    try:
        return generate_overall_insights(quiz_id=payload.quiz_id, user_id=current_user.id)
    except LLMServiceError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
