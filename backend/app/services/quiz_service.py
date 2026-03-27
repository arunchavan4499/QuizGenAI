import uuid
import json
import sys
import re
from pathlib import Path
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.schemas import (
    ExplainRequest,
    ExplainResponse,
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
    ReviewAnswerItem,
)
from db.models import QuizAdvanced, QuizBeginner, QuizIntermediate, QuizOverall


class LLMServiceError(RuntimeError):
    pass

# Try to import LLM chains. Requests must fail if unavailable.
llm_chains_available = False
try:
    # Add llm_service to path if not already there
    llm_service_path = Path(__file__).parent.parent.parent.parent / "llm_service"
    if llm_service_path.exists() and str(llm_service_path) not in sys.path:
        sys.path.insert(0, str(llm_service_path))
    
    from chains.quiz_chain import run_full_quiz_chain, run_quiz_chain
    from chains.explain_chain import run_explain_chain
    from chains.insight_chain import run_insight_chain
    from rag.rag_pipeline import build_context_for_quiz
    llm_chains_available = True
except ImportError as e:
    print(f"Error: LLM chains not available ({e}).")


_QUIZ_TEMP_STORE: dict[tuple[str, int], dict[DifficultyLevel, dict]] = {}
_QUIZ_SECTION_CACHE: dict[tuple[str, int], dict[DifficultyLevel, list[dict]]] = {}
_ANSWER_KEY_STORE: dict[str, list[dict]] = {}


def _sanitize_insight_text(value: str) -> str:
    text = str(value or "").strip()
    # Keep content plain-text and remove markdown-like formatters.
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = re.sub(r"__(.*?)__", r"\1", text)
    text = re.sub(r"`([^`]*)`", r"\1", text)
    return text


def _sanitize_text_list(values: list[str]) -> list[str]:
    return [_sanitize_insight_text(item) for item in values if str(item or "").strip()]


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


def _quiz_model_for_difficulty(difficulty: DifficultyLevel):
    if difficulty == DifficultyLevel.beginner:
        return QuizBeginner
    if difficulty == DifficultyLevel.intermediate:
        return QuizIntermediate
    return QuizAdvanced


def persist_section_result(
    db: Session,
    user_id: int,
    difficulty: DifficultyLevel,
    marks_obtained: float,
    total_marks: float,
    time_taken_seconds: int = 0,
) -> tuple[float, float]:
    model = _quiz_model_for_difficulty(difficulty)
    db_row = model(
        user_id=str(user_id),
        marks=marks_obtained,
        total_marks=total_marks,
        time_taken_seconds=max(0, int(time_taken_seconds)),
    )
    db.add(db_row)
    db.commit()
    db.refresh(db_row)

    latest_row = db.execute(
        select(model)
        .where(model.user_id == str(user_id))
        .order_by(model.id.desc())
        .limit(1)
    ).scalar_one_or_none()

    if latest_row is None:
        return marks_obtained, total_marks
    return float(latest_row.marks), float(latest_row.total_marks)


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
    if isinstance(error, TimeoutError) or "timed out" in message.lower():
        raise LLMServiceError(f"LLM timeout: {message}") from error
    if "NVIDIA_API_KEY" in message:
        raise LLMServiceError("NVIDIA_API_KEY is missing or not loaded.") from error
    if "401" in message or "Unauthorized" in message:
        raise LLMServiceError("LLM provider authentication failed (401). Check NVIDIA_API_KEY.") from error
    if "403" in message or "Forbidden" in message:
        raise LLMServiceError("LLM provider access forbidden (403). Check API key permissions.") from error
    raise LLMServiceError(f"{context} failed: {message}") from error


def generate_explanation(payload: ExplainRequest) -> ExplainResponse:
    """Generate an explanation first, so UI can show this before quiz generation."""
    _ensure_llm_available()

    try:
        if payload.input_type == InputType.document:
            document_text = payload.document_text or ""
            query = payload.topic or payload.question or "key concepts"
            context = build_context_for_quiz(
                document_id=f"explain:{uuid.uuid4().hex[:10]}",
                text=document_text,
                query=query,
                k=6,
            )
            prompt_question = payload.question or "Explain the core ideas from this document for a beginner."
            # Document-based explain should use the RAG-preferred provider first.
            explanation = run_explain_chain(context, prompt_question, task="rag")
        else:
            topic = payload.topic or "topic"
            prompt_question = payload.question or f"Explain {topic} for a beginner with simple examples."
            explanation = run_explain_chain(topic, prompt_question, task="explain")
    except Exception as e:
        _raise_llm_error("Explanation generation", e)

    return ExplainResponse(explanation=str(explanation).strip())


def _validate_questions_for_section(raw_questions: list[dict], expected_count: int, difficulty: DifficultyLevel) -> list[Question]:
    def _to_option_text(option: object) -> str:
        if isinstance(option, str):
            return option.strip()
        if isinstance(option, dict):
            for key in ("label", "text", "value", "option"):
                value = option.get(key)
                if isinstance(value, str) and value.strip():
                    return value.strip()
        return str(option).strip()

    def _normalize_text(value: object) -> str:
        return " ".join(str(value or "").strip().lower().split())

    def _resolve_correct_answer(raw_correct_answer: object, options: list[str]) -> str | None:
        if not options:
            return None

        raw = str(raw_correct_answer or "").strip()
        normalized_raw = _normalize_text(raw)
        if not normalized_raw:
            return options[0]

        # Exact text match (case-insensitive/whitespace-insensitive).
        for option in options:
            if _normalize_text(option) == normalized_raw:
                return option

        # Common letter/index formats: A/B/C/D or 1/2/3/4.
        if len(raw) == 1 and raw.upper() in {"A", "B", "C", "D"}:
            idx = ord(raw.upper()) - ord("A")
            if 0 <= idx < len(options):
                return options[idx]
        if raw.isdigit():
            idx = int(raw) - 1
            if 0 <= idx < len(options):
                return options[idx]

        # Prefix forms like "A) ...", "B. ...", "1) ...".
        prefix = raw[:1].upper()
        if prefix in {"A", "B", "C", "D"} and len(raw) >= 2 and raw[1] in {")", ".", ":", "-"
        }:
            idx = ord(prefix) - ord("A")
            if 0 <= idx < len(options):
                return options[idx]

        # As a fallback, pick the first option so quiz generation proceeds.
        return options[0]

    questions: list[Question] = []
    for index, q in enumerate(raw_questions[:expected_count], start=1):
        options = [_to_option_text(option) for option in q.get("options", [])]
        options = [option for option in options if option]
        if len(options) < 2:
            raise LLMServiceError(
                f"LLM returned insufficient options for {difficulty.value} question {index}."
            )

        correct_answer = _resolve_correct_answer(q.get("correct_answer"), options)
        if correct_answer is None:
            raise LLMServiceError(
                f"LLM returned invalid correct_answer for {difficulty.value} question {index}."
            )

        # Canonicalize values so verification token and UI answer flow are consistent.
        q["options"] = options
        q["correct_answer"] = correct_answer

        questions.append(
            Question(
                question_id=q.get("question_id", f"q{index}"),
                prompt=q.get("prompt", ""),
                options=options,
            )
        )

    if len(questions) != expected_count:
        raise LLMServiceError(
            f"LLM returned {len(questions)} {difficulty.value} questions, expected {expected_count}."
        )
    return questions


def generate_quiz(payload: GenerateQuizRequest, user_id: int) -> GenerateQuizResponse:
    """Generate full quiz once, cache all sections in temp storage, and serve requested section."""
    _ensure_llm_available()
    quiz_id = payload.quiz_id or f"quiz_{uuid.uuid4().hex[:10]}"
    temp_key = (quiz_id, user_id)

    question_count = payload.question_count or 5

    section_cache = _QUIZ_SECTION_CACHE.get(temp_key)

    if section_cache is None:
        try:
            if payload.input_type == InputType.document:
                document_text = payload.document_text or ""
                query = payload.topic or "key concepts"
                document_id = f"{quiz_id}:all"
                context = build_context_for_quiz(
                    document_id=document_id,
                    text=document_text,
                    query=query,
                    k=6,
                )
                full_quiz = run_full_quiz_chain(
                    context,
                    question_count=5,
                    use_context=True,
                )
            else:
                topic = payload.topic or "topic"
                full_quiz = run_full_quiz_chain(
                    topic,
                    question_count=5,
                    use_context=False,
                )
        except Exception as e:
            _raise_llm_error("Quiz generation", e)

        section_cache = {
            DifficultyLevel.beginner: full_quiz.get("beginner", []),
            DifficultyLevel.intermediate: full_quiz.get("intermediate", []),
            DifficultyLevel.advanced: full_quiz.get("advanced", []),
        }
        _QUIZ_SECTION_CACHE[temp_key] = section_cache

    raw_section_questions = section_cache.get(payload.difficulty, [])
    questions = _validate_questions_for_section(raw_section_questions, question_count, payload.difficulty)
    raw_token_questions = raw_section_questions[:question_count]

    return GenerateQuizResponse(
        quiz_id=quiz_id,
        difficulty=payload.difficulty,
        questions=questions,
        verification_token=_build_verification_token(raw_token_questions),
    )


def submit_answers(payload: SubmitAnswersRequest, user_id: int) -> SubmitAnswersResponse:
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
    marks_obtained = float(correct_count)
    total_marks = float(total_questions)
    score = round((marks_obtained / total_marks) * 100, 2)

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
        marks_obtained=marks_obtained,
        total_marks=total_marks,
        review_items=[
            ReviewAnswerItem(
                question_id=str(record.get("question_id", "")),
                prompt=str(record.get("prompt", "")),
                selected_answer=str(record.get("selected_answer", "")),
                correct_answer=str(record.get("correct_answer", "")),
                is_correct=bool(record.get("is_correct", False)),
                explanation=record.get("explanation"),
            )
            for record in section_records
        ],
        insights=insights,
    )


def generate_overall_insights(quiz_id: str, user_id: int) -> OverallInsightsResponse:
    """Generate overall insights with a single LLM call using temporary section data."""
    _ensure_llm_available()
    temp_key = (quiz_id, user_id)
    section_data = _QUIZ_TEMP_STORE.get(temp_key)
    if not section_data:
        raise LLMServiceError("No section data found for this quiz/user. Submit sections first.")

    required_sections = [DifficultyLevel.beginner, DifficultyLevel.intermediate, DifficultyLevel.advanced]
    missing_sections = [section.value for section in required_sections if section not in section_data]
    if missing_sections:
        raise LLMServiceError(
            "Quiz is incomplete. Submit all sections before requesting final insights. "
            f"Missing: {', '.join(missing_sections)}"
        )

    flattened_records: list[dict] = []
    section_scores: list[float] = []
    section_summary: dict[str, dict] = {}
    wrong_answers: list[WrongAnswerDetail] = []

    for difficulty, data in section_data.items():
        section_scores.append(float(data.get("score", 0)))
        section_summary[difficulty.value] = {
            "score": float(data.get("score", 0)),
            "answered": len(data.get("records", [])),
            "correct": sum(1 for record in data.get("records", []) if record.get("is_correct")),
        }
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
    quiz_data = json.dumps(
        {
            "quiz_id": quiz_id,
            "overall_score": overall_score,
            "completion": {"required_sections": [section.value for section in required_sections], "submitted": list(section_summary.keys())},
            "section_summary": section_summary,
            "sections": flattened_records,
        }
    )
    user_answers = json.dumps(flattened_records)

    try:
        llm_result = run_insight_chain(quiz_data, user_answers)
    except Exception as e:
        _raise_llm_error("Overall insight generation", e)

    insights_dict = llm_result.get("insights", {})
    insights = Insights(
        strengths=_sanitize_text_list(insights_dict.get("strengths", [])),
        weaknesses=_sanitize_text_list(insights_dict.get("weaknesses", [])),
        recommendations=_sanitize_text_list(insights_dict.get("recommendations", [])),
    )

    # Persist overall outcome so quiz_overall is the source of truth for final completion artifacts.
    _QUIZ_TEMP_STORE.setdefault(temp_key, {})
    _QUIZ_TEMP_STORE[temp_key]["_overall"] = {
        "score": overall_score,
        "insights": insights.model_dump(),
    }

    return OverallInsightsResponse(
        score=overall_score,
        insights=insights,
        wrong_answers=wrong_answers,
    )


def persist_overall_result(db: Session, user_id: int, score: float, insights: Insights, time_taken_seconds: int = 0) -> None:
    row = QuizOverall(
        user_id=str(user_id),
        marks=float(score),
        insights=json.dumps(insights.model_dump()),
        time_taken_seconds=max(0, int(time_taken_seconds)),
    )
    db.add(row)
    db.commit()
