# Backend Endpoint Handoff (For Frontend, LLM, DB Review)

This document lists the currently implemented backend endpoints for Milestone 1.

## Base API
- Local base URL: `http://localhost:8000`
- OpenAPI docs: `http://localhost:8000/docs`

## 1) Health Check
- Method: `GET`
- Path: `/health`
- Purpose: quick service readiness check

### Response 200
```json
{
  "status": "ok"
}
```

## 2) Generate Quiz
- Method: `POST`
- Path: `/quiz/generate`
- Purpose: generate quiz by either topic or document input

### Request Body
```json
{
  "input_type": "topic",
  "topic": "Python decorators",
  "difficulty": "beginner",
  "question_count": 3
}
```

### Request Rules
- `input_type` allowed values: `topic`, `document`
- `difficulty` allowed values: `beginner`, `intermediate`, `advanced`
- If `input_type=topic`, `topic` is required
- If `input_type=document`, `document_text` is required
- `question_count` range: `1` to `20`

### Response 200
```json
{
  "quiz_id": "quiz_abc123def0",
  "difficulty": "beginner",
  "verification_token": "opaque_token_used_for_backend_answer_verification",
  "questions": [
    {
      "question_id": "q1",
      "prompt": "(Beginner) Question 1 about Python decorators",
      "options": ["Option A", "Option B", "Option C", "Option D"]
    }
  ]
}
```

Notes:
- `verification_token` is opaque and required by `/quiz/submit`.
- Correct answers are not exposed in plain response fields.

## 3) Submit Answers
- Method: `POST`
- Path: `/quiz/submit`
- Purpose: submit answers, receive score + insights, and record leaderboard score

### Request Body
```json
{
  "quiz_id": "quiz_abc123def0",
  "user_id": "user-1",
  "difficulty": "beginner",
  "verification_token": "opaque_token_used_for_backend_answer_verification",
  "answers": [
    { "question_id": "q1", "answer": "Option A" },
    { "question_id": "q2", "answer": "Option C" }
  ]
}
```

### Response 200
```json
{
  "score": 100,
  "correct_count": 2,
  "total_questions": 2,
  "insights": {
    "strengths": ["Answered 2 of 2 correctly."],
    "weaknesses": [],
    "recommendations": [
      "Complete all three sections to receive overall LLM insights."
    ]
  }
}
```

## 4) Final Overall Insights
- Method: `POST`
- Path: `/quiz/insights/final`
- Purpose: run one LLM call over all submitted section data for a quiz/user

### Request Body
```json
{
  "quiz_id": "quiz_abc123def0",
  "user_id": "user-1"
}
```

### Response 200
```json
{
  "score": 83.33,
  "insights": {
    "strengths": ["..."],
    "weaknesses": ["..."],
    "recommendations": ["..."]
  },
  "wrong_answers": [
    {
      "difficulty": "intermediate",
      "question_id": "q2",
      "prompt": "...",
      "selected_answer": "...",
      "correct_answer": "...",
      "explanation": "..."
    }
  ]
}
```

## 5) Leaderboard by Difficulty
- Method: `GET`
- Path: `/leaderboard/{difficulty}`
- Purpose: return ranking entries by selected difficulty

### Path Parameter
- `difficulty`: `beginner` | `intermediate` | `advanced`

### Query Parameter
- `limit` (optional): integer, default `10`, min `1`, max `100`

### Example
- `GET /leaderboard/beginner?limit=10`

### Response 200
```json
{
  "difficulty": "beginner",
  "entries": [
    { "user_id": "user-1", "score": 100 }
  ],
  "top_percentages": [100]
}
```

## 6) Overall Leaderboard
- Method: `GET`
- Path: `/leaderboard/overall`
- Purpose: aggregate all section tables (`beginner`, `intermediate`, `advanced`) into overall ranking

### Response 200
```json
{
  "difficulty": "overall",
  "entries": [
    { "user_id": "user-1", "score": 87.5 }
  ],
  "top_percentages": [100]
}
```

## Team Review Checklist
- Frontend review:
  - Confirm request and response field names are final for current sprint.
  - Confirm all error states needed for UI are represented.

- LLM review:
  - Confirm quiz and insights response shape matches model outputs.
  - Confirm difficulty/input_type values are aligned with prompt logic.

- DB review:
  - Confirm leaderboard fields (`user_id`, `difficulty`, `score`) are sufficient for migration design.
  - Confirm attempt persistence fields needed for later milestones.

## Current Notes
- Fallback quiz/insight mocks were removed. Endpoints return real LLM results or explicit error responses.
- Contracts are already reflected in `shared/schemas` and backend Pydantic models.
