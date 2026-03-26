import uuid
import json
import sys
from pathlib import Path

from app.models.schemas import (
    GenerateQuizRequest,
    GenerateQuizResponse,
    InputType,
    Insights,
    DifficultyLevel,
    Question,
    WrongAnswerDetail,
    OverallInsightsResponse,
    SubmitAnswersRequest,
    SubmitAnswersResponse,
)


class LLMServiceError(RuntimeError):
    pass

# Try to import LLM chains. Requests must fail if unavailable.
llm_chains_available = False
try:
    # Add llm_service to path if not already there
    llm_service_path = Path(__file__).parent.parent.parent.parent / "llm_service"
    if llm_service_path.exists() and str(llm_service_path) not in sys.path:
        sys.path.insert(0, str(llm_service_path))
    
    from chains.quiz_chain import run_quiz_chain
    from chains.insight_chain import run_insight_chain
    from rag.rag_pipeline import build_context_for_quiz
    llm_chains_available = True
except ImportError as e:
    print(f"Error: LLM chains not available ({e}).")


_QUIZ_TEMP_STORE: dict[tuple[str, str], dict[DifficultyLevel, dict]] = {}
_ANSWER_KEY_STORE: dict[str, list[dict]] = {}


def _build_verification_token(raw_questions: list[dict]) -> str:
    answer_key = []
    for q in raw_questions:
        answer_key.append(
            {
                "question_id": q.get("question_id"),
                "prompt": q.get("prompt", ""),
                "correct_answer": q.get("correct_answer", ""),
                "explanation": q.get("explanation"),
            }
        )
    token = uuid.uuid4().hex
    _ANSWER_KEY_STORE[token] = answer_key
    return token


def _decode_verification_token(token: str) -> list[dict]:
    parsed = _ANSWER_KEY_STORE.get(token)
    if parsed is None:
        raise LLMServiceError("Verification token is invalid or expired.")
    return parsed


def _ensure_llm_available() -> None:
    if not llm_chains_available:
        raise LLMServiceError("LLM chains are unavailable. Ensure llm_service dependencies are installed.")


def _raise_llm_error(context: str, error: Exception) -> None:
    message = str(error)
    if "NVIDIA_API_KEY" in message:
        raise LLMServiceError("NVIDIA_API_KEY is missing or not loaded.") from error
    if "401" in message or "Unauthorized" in message:
        raise LLMServiceError("LLM provider authentication failed (401). Check NVIDIA_API_KEY.") from error
    if "403" in message or "Forbidden" in message:
        raise LLMServiceError("LLM provider access forbidden (403). Check API key permissions.") from error
    raise LLMServiceError(f"{context} failed: {message}") from error


def generate_quiz(payload: GenerateQuizRequest) -> GenerateQuizResponse:
    """Generate section quiz using one LLM call and include signed answer key token."""
    _ensure_llm_available()
    quiz_id = payload.quiz_id or f"quiz_{uuid.uuid4().hex[:10]}"

    question_count = payload.question_count or 5

    try:
        if payload.input_type == InputType.document:
            document_text = payload.document_text or ""
            query = payload.topic or "key concepts"
            document_id = f"{quiz_id}:{payload.difficulty.value}"
            context = build_context_for_quiz(
                document_id=document_id,
                text=document_text,
                query=query,
                k=6,
            )
            llm_questions = run_quiz_chain(
                context,
                payload.difficulty.value,
                question_count,
                use_context=True,
            )
        else:
            topic = payload.topic or "topic"
            llm_questions = run_quiz_chain(
                topic,
                payload.difficulty.value,
                question_count,
                use_context=False,
            )
    except Exception as e:
        _raise_llm_error("Quiz generation", e)

    questions = []
    for index, q in enumerate(llm_questions, start=1):
        correct_answer = q.get("correct_answer")
        options = q.get("options", [])
        if correct_answer not in options:
            raise LLMServiceError(
                f"LLM returned invalid correct_answer for question {index}."
            )

        question = Question(
            question_id=q.get("question_id", f"q{index}"),
            prompt=q.get("prompt", ""),
            options=options,
        )
        questions.append(question)

    if len(questions) != question_count:
        raise LLMServiceError(
            f"LLM returned {len(questions)} questions, expected {question_count}."
        )

    return GenerateQuizResponse(
        quiz_id=quiz_id,
        difficulty=payload.difficulty,
        questions=questions,
        verification_token=_build_verification_token(llm_questions),
    )


def submit_answers(payload: SubmitAnswersRequest, user_id: str) -> SubmitAnswersResponse:
    """Submit section answers and score locally using signed answer key token."""
    expected_questions = _decode_verification_token(payload.verification_token)
    expected_by_id = {q["question_id"]: q for q in expected_questions if q.get("question_id")}

    correct_count = 0
    wrong_count = 0
    wrong_prompts: list[str] = []
    section_records: list[dict] = []

    for answer in payload.answers:
        expected = expected_by_id.get(answer.question_id)
        if expected is None:
            continue

        correct_answer = expected.get("correct_answer", "")
        is_correct = answer.answer == correct_answer
        if is_correct:
            correct_count += 1
        else:
            wrong_count += 1
            wrong_prompts.append(expected.get("prompt", answer.question_id))

        section_records.append(
            {
                "question_id": answer.question_id,
                "prompt": expected.get("prompt", ""),
                "selected_answer": answer.answer,
                "correct_answer": correct_answer,
                "is_correct": is_correct,
                "explanation": expected.get("explanation"),
            }
        )

    total_questions = max(1, len(expected_questions))
    score = round((correct_count / total_questions) * 100, 2)

    temp_key = (payload.quiz_id, user_id)
    if temp_key not in _QUIZ_TEMP_STORE:
        _QUIZ_TEMP_STORE[temp_key] = {}
    _QUIZ_TEMP_STORE[temp_key][payload.difficulty] = {
        "score": score,
        "records": section_records,
    }

    insights = Insights(
        strengths=[f"Answered {correct_count} of {total_questions} correctly."],
        weaknesses=[f"Missed {wrong_count} questions in this section."] if wrong_count else [],
        recommendations=["Complete all three sections to receive overall LLM insights."],
    )

    return SubmitAnswersResponse(
        score=score,
        correct_count=correct_count,
        total_questions=total_questions,
        insights=insights,
    )


def generate_overall_insights(quiz_id: str, user_id: str) -> OverallInsightsResponse:
    """Generate overall insights with a single LLM call using temporary section data."""
    _ensure_llm_available()
    temp_key = (quiz_id, user_id)
    section_data = _QUIZ_TEMP_STORE.get(temp_key)
    if not section_data:
        raise LLMServiceError("No section data found for this quiz/user. Submit sections first.")

    flattened_records: list[dict] = []
    section_scores: list[float] = []
    wrong_answers: list[WrongAnswerDetail] = []

    for difficulty, data in section_data.items():
        section_scores.append(float(data.get("score", 0)))
        for record in data.get("records", []):
            flattened_records.append(
                {
                    "difficulty": difficulty.value,
                    "question_id": record.get("question_id"),
                    "prompt": record.get("prompt"),
                    "selected_answer": record.get("selected_answer"),
                    "correct_answer": record.get("correct_answer"),
                    "is_correct": record.get("is_correct"),
                    "explanation": record.get("explanation"),
                }
            )
            if not record.get("is_correct"):
                wrong_answers.append(
                    WrongAnswerDetail(
                        difficulty=difficulty,
                        question_id=record.get("question_id", ""),
                        prompt=record.get("prompt", ""),
                        selected_answer=record.get("selected_answer", ""),
                        correct_answer=record.get("correct_answer", ""),
                        explanation=record.get("explanation"),
                    )
                )

    overall_score = round(sum(section_scores) / max(1, len(section_scores)), 2)
    quiz_data = json.dumps({"quiz_id": quiz_id, "overall_score": overall_score, "sections": flattened_records})
    user_answers = json.dumps(flattened_records)

    try:
        llm_result = run_insight_chain(quiz_data, user_answers)
    except Exception as e:
        _raise_llm_error("Overall insight generation", e)

    insights_dict = llm_result.get("insights", {})
    insights = Insights(
        strengths=insights_dict.get("strengths", []),
        weaknesses=insights_dict.get("weaknesses", []),
        recommendations=insights_dict.get("recommendations", []),
    )

    return OverallInsightsResponse(
        score=overall_score,
        insights=insights,
        wrong_answers=wrong_answers,
    )
