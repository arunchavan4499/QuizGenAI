import uuid

from fastapi.testclient import TestClient

from app.main import app
from app.services import quiz_service


client = TestClient(app)


def _create_auth_headers(email_prefix: str = "quizflow") -> dict[str, str]:
    payload = {
        "name": "Quiz Flow User",
        "email": f"{email_prefix}_{uuid.uuid4().hex[:8]}@example.com",
        "password": "StrongPass123",
    }
    reg = client.post("/auth/register", json=payload)
    assert reg.status_code == 201

    login = client.post("/auth/login", json={"email": payload["email"], "password": payload["password"]})
    assert login.status_code == 200
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _mock_quiz_chain(source_input: str, difficulty: str, question_count: int = 5, use_context: bool = False):
    questions = []
    for i in range(question_count):
        questions.append(
            {
                "question_id": f"q{i+1}",
                "prompt": f"({difficulty.title()}) {source_input} question {i+1}",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correct_answer": "Option A",
                "explanation": "Option A is correct for this mock.",
            }
        )
    return questions


def _mock_insight_chain(quiz_data: str, user_answers: str):
    return {
        "score": 85.0,
        "insights": {
            "strengths": ["Strong foundational understanding"],
            "weaknesses": ["Needs more practice on edge cases"],
            "recommendations": ["Review incorrect answers section by section"],
        },
    }


def _mock_build_context_for_quiz(document_id: str, text: str, query: str, k: int = 4):
    return f"context::{document_id}::{query}::{k}::{len(text)}"


def setup_module() -> None:
    quiz_service.llm_chains_available = True
    quiz_service.run_quiz_chain = _mock_quiz_chain
    quiz_service.run_insight_chain = _mock_insight_chain
    quiz_service.build_context_for_quiz = _mock_build_context_for_quiz


def test_topic_quiz_flow_and_leaderboard_update() -> None:
    headers = _create_auth_headers("topicflow")
    generate_payload = {
        "input_type": "topic",
        "topic": "Python decorators",
        "difficulty": "beginner",
        "question_count": 3,
    }

    generate_response = client.post("/quiz/generate", json=generate_payload, headers=headers)
    assert generate_response.status_code == 200

    quiz_data = generate_response.json()
    assert quiz_data["difficulty"] == "beginner"
    assert len(quiz_data["questions"]) == 3
    assert "verification_token" in quiz_data

    submit_payload = {
        "quiz_id": quiz_data["quiz_id"],
        "difficulty": "beginner",
        "verification_token": quiz_data["verification_token"],
        "answers": [
            {"question_id": "q1", "answer": "Option A"},
            {"question_id": "q2", "answer": "Option A"},
            {"question_id": "q3", "answer": "Option A"},
        ],
    }

    submit_response = client.post("/quiz/submit", json=submit_payload, headers=headers)
    assert submit_response.status_code == 200

    submit_data = submit_response.json()
    assert submit_data["score"] == 100
    assert submit_data["correct_count"] == 3
    assert submit_data["total_questions"] == 3
    assert "strengths" in submit_data["insights"]
    assert "weaknesses" in submit_data["insights"]

    leaderboard_response = client.get("/leaderboard/beginner", headers=headers)
    assert leaderboard_response.status_code == 200

    leaderboard_data = leaderboard_response.json()
    assert leaderboard_data["difficulty"] == "beginner"
    assert len(leaderboard_data["entries"]) >= 1
    assert len(leaderboard_data["top_percentages"]) == len(leaderboard_data["entries"])


def test_final_overall_insights_from_temp_store() -> None:
    headers = _create_auth_headers("overallflow")
    shared_quiz_id = "quiz_overall_session_1"
    for difficulty in ["beginner", "intermediate", "advanced"]:
        generate_payload = {
            "quiz_id": shared_quiz_id,
            "input_type": "topic",
            "topic": "Python decorators",
            "difficulty": difficulty,
            "question_count": 2,
        }
        generate_response = client.post("/quiz/generate", json=generate_payload, headers=headers)
        assert generate_response.status_code == 200
        quiz_data = generate_response.json()

        submit_payload = {
            "quiz_id": quiz_data["quiz_id"],
            "difficulty": difficulty,
            "verification_token": quiz_data["verification_token"],
            "answers": [
                {"question_id": "q1", "answer": "Option A"},
                {"question_id": "q2", "answer": "Option A"},
            ],
        }
        submit_response = client.post("/quiz/submit", json=submit_payload, headers=headers)
        assert submit_response.status_code == 200

    final_payload = {"quiz_id": shared_quiz_id}
    final_response = client.post("/quiz/insights/final", json=final_payload, headers=headers)
    assert final_response.status_code == 200

    final_data = final_response.json()
    assert "insights" in final_data
    assert "score" in final_data
    assert "wrong_answers" in final_data


def test_document_path_requires_document_text() -> None:
    headers = _create_auth_headers("docflow")
    invalid_payload = {
        "input_type": "document",
        "difficulty": "intermediate",
        "question_count": 2,
    }

    response = client.post("/quiz/generate", json=invalid_payload, headers=headers)
    assert response.status_code == 422


def test_document_path_uses_rag_context() -> None:
    headers = _create_auth_headers("ragflow")

    captured = {"use_context": None, "source_input": None}

    def capture_chain(source_input: str, difficulty: str, question_count: int = 5, use_context: bool = False):
        captured["use_context"] = use_context
        captured["source_input"] = source_input
        return _mock_quiz_chain("RAG derived", difficulty, question_count)

    quiz_service.run_quiz_chain = capture_chain

    payload = {
        "quiz_id": "quiz_rag_1",
        "input_type": "document",
        "document_text": "Decorators wrap functions to extend behavior.",
        "topic": "decorators",
        "difficulty": "beginner",
        "question_count": 2,
    }

    response = client.post("/quiz/generate", json=payload, headers=headers)
    assert response.status_code == 200
    assert captured["use_context"] is True
    assert isinstance(captured["source_input"], str)
    assert captured["source_input"].startswith("context::")

    # restore default mock chain for subsequent tests
    quiz_service.run_quiz_chain = _mock_quiz_chain


def test_quiz_endpoints_require_authentication() -> None:
    payload = {
        "input_type": "topic",
        "topic": "Python decorators",
        "difficulty": "beginner",
        "question_count": 2,
    }
    response = client.post("/quiz/generate", json=payload)
    assert response.status_code == 401
