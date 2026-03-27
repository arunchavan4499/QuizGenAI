from fastapi import APIRouter, HTTPException

from app.config import use_db_leaderboard
from app import deps
from app.schemas import (
    ExplainRequest,
    ExplainResponse,
    GenerateQuizRequest,
    GenerateQuizResponse,
    OverallInsightsRequest,
    OverallInsightsResponse,
    SubmitAnswersRequest,
    SubmitAnswersResponse,
)
from app.services.quiz_service import (
    LLMServiceError,
    generate_explanation,
    generate_overall_insights,
    generate_quiz,
    persist_overall_result,
    persist_section_result,
    submit_answers,
)
from app.services.leaderboard_service import record_score

router = APIRouter()


@router.post("/explain", response_model=ExplainResponse)
def explain_quiz_input_endpoint(payload: ExplainRequest, current_user: deps.CurrentUser) -> ExplainResponse:
    try:
        return generate_explanation(payload)
    except LLMServiceError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/generate", response_model=GenerateQuizResponse)
def generate_quiz_endpoint(payload: GenerateQuizRequest, current_user: deps.CurrentUser) -> GenerateQuizResponse:
    try:
        return generate_quiz(payload, current_user.id)
    except LLMServiceError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/submit", response_model=SubmitAnswersResponse)
def submit_answers_endpoint(
    payload: SubmitAnswersRequest,
    current_user: deps.CurrentUser,
    db: deps.DBSession,
) -> SubmitAnswersResponse:
    try:
        result = submit_answers(payload, current_user.id)
        db_marks, db_total_marks = persist_section_result(
            db=db,
            user_id=current_user.id,
            difficulty=payload.difficulty,
            marks_obtained=result.marks_obtained,
            total_marks=result.total_marks,
            time_taken_seconds=0,
        )
    except LLMServiceError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to persist section result: {exc}") from exc

    persisted_score = round((db_marks / max(1.0, db_total_marks)) * 100, 2)
    if not use_db_leaderboard():
        record_score(user_id=current_user.id, difficulty=payload.difficulty, score=persisted_score)
    return SubmitAnswersResponse(
        score=persisted_score,
        correct_count=int(round(db_marks)),
        total_questions=int(round(db_total_marks)),
        marks_obtained=db_marks,
        total_marks=db_total_marks,
        review_items=result.review_items,
        insights=result.insights,
    )


@router.post("/insights/final", response_model=OverallInsightsResponse)
def final_overall_insights_endpoint(
    payload: OverallInsightsRequest,
    current_user: deps.CurrentUser,
    db: deps.DBSession,
) -> OverallInsightsResponse:
    try:
        response = generate_overall_insights(quiz_id=payload.quiz_id, user_id=current_user.id)
        persist_overall_result(
            db=db,
            user_id=current_user.id,
            score=response.score,
            insights=response.insights,
            time_taken_seconds=0,
        )
        return response
    except LLMServiceError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to persist overall result: {exc}") from exc
