"""
Test LLM integration with backend services.
Tests both direct chain calls and through the FastAPI endpoints.
"""
import json
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.schemas import InputType, DifficultyLevel, GenerateQuizRequest, SubmitAnswersRequest, AnswerItem

client = TestClient(app)

# Try to import LLM chains for direct testing
llm_chains_available = False
try:
    llm_service_path = Path(__file__).parent.parent.parent / "llm_service"
    if llm_service_path.exists() and str(llm_service_path) not in sys.path:
        sys.path.insert(0, str(llm_service_path))
    
    from chains.quiz_chain import run_quiz_chain
    from chains.insight_chain import run_insight_chain
    llm_chains_available = True
except ImportError:
    print("Warning: LLM chains not available for direct testing")


class TestLLMQuizIntegration:
    """Test LLM quiz generation integration."""
    
    def test_generate_quiz_with_topic(self):
        """Test generating quiz from topic via API."""
        payload = {
            "input_type": "topic",
            "topic": "Python decorators",
            "difficulty": "beginner",
            "question_count": 3,
        }
        
        response = client.post("/quiz/generate", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["difficulty"] == "beginner"
        assert len(data["questions"]) == 3
        
        # Verify question structure
        for question in data["questions"]:
            assert "question_id" in question
            assert "prompt" in question
            assert "options" in question
            assert len(question["options"]) == 4
    
    def test_generate_quiz_with_document(self):
        """Test generating quiz from document text via API."""
        payload = {
            "input_type": "document",
            "document_text": "The solar system consists of the Sun and all objects that orbit it. The planets are Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune.",
            "difficulty": "intermediate",
            "question_count": 2,
        }
        
        response = client.post("/quiz/generate", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["difficulty"] == "intermediate"
        assert len(data["questions"]) == 2
    
    @pytest.mark.skipif(not llm_chains_available, reason="LLM chains not available")
    def test_quiz_chain_direct(self):
        """Test quiz chain directly."""
        questions = run_quiz_chain("Python decorators", "beginner", 2)
        
        assert isinstance(questions, list)
        assert len(questions) > 0
        
        for question in questions:
            assert "question_id" in question
            assert "prompt" in question
            assert "options" in question
            assert len(question["options"]) == 4


class TestLLMInsightIntegration:
    """Test LLM insight generation integration."""
    
    def test_submit_answers_generates_insights(self):
        """Test answer submission generates insights via LLM."""
        # First generate a quiz
        generate_payload = {
            "input_type": "topic",
            "topic": "Python basics",
            "difficulty": "beginner",
            "question_count": 2,
        }
        
        gen_response = client.post("/quiz/generate", json=generate_payload)
        assert gen_response.status_code == 200
        quiz_data = gen_response.json()
        
        # Submit answers
        submit_payload = {
            "quiz_id": quiz_data["quiz_id"],
            "user_id": "test-user",
            "difficulty": "beginner",
            "answers": [
                {"question_id": "q1", "answer": "Option A"},
                {"question_id": "q2", "answer": "Option B"},
            ],
        }
        
        response = client.post("/quiz/submit", json=submit_payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "score" in data
        assert 0 <= data["score"] <= 100
        
        # Verify insights structure
        assert "insights" in data
        assert "strengths" in data["insights"]
        assert "weaknesses" in data["insights"]
        assert "recommendations" in data["insights"]
        
        # Insights should have content
        assert isinstance(data["insights"]["strengths"], list)
        assert isinstance(data["insights"]["weaknesses"], list)
        assert isinstance(data["insights"]["recommendations"], list)
    
    @pytest.mark.skipif(not llm_chains_available, reason="LLM chains not available")
    def test_insight_chain_direct(self):
        """Test insight chain directly."""
        quiz_data = json.dumps({
            "topic": "Python decorators",
            "difficulty": "beginner"
        })
        
        user_answers = json.dumps([
            {"question_id": "q1", "answer": "Option A"},
            {"question_id": "q2", "answer": "Option B"},
        ])
        
        result = run_insight_chain(quiz_data, user_answers)
        
        assert "score" in result
        assert "insights" in result
        assert "strengths" in result["insights"]
        assert "weaknesses" in result["insights"]
        assert "recommendations" in result["insights"]


class TestEndToEndFlow:
    """Test complete end-to-end flow with LLM integration."""
    
    def test_complete_quiz_flow(self):
        """Test complete flow: generate -> submit -> leaderboard."""
        # Step 1: Generate quiz
        generate_payload = {
            "input_type": "topic",
            "topic": "Machine Learning",
            "difficulty": "advanced",
            "question_count": 3,
        }
        
        gen_response = client.post("/quiz/generate", json=generate_payload)
        assert gen_response.status_code == 200
        quiz_data = gen_response.json()
        
        # Step 2: Submit answers
        submit_payload = {
            "quiz_id": quiz_data["quiz_id"],
            "user_id": "ml-student",
            "difficulty": "advanced",
            "answers": [
                {"question_id": q["question_id"], "answer": q["options"][0]}
                for q in quiz_data["questions"]
            ],
        }
        
        submit_response = client.post("/quiz/submit", json=submit_payload)
        assert submit_response.status_code == 200
        
        submit_data = submit_response.json()
        assert "score" in submit_data
        assert "insights" in submit_data
        
        # Step 3: Check leaderboard
        leaderboard_response = client.get("/leaderboard/advanced")
        assert leaderboard_response.status_code == 200
        
        leaderboard_data = leaderboard_response.json()
        assert any(entry["user_id"] == "ml-student" for entry in leaderboard_data["entries"])


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
