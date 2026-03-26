# LLM Integration with Backend

## Overview
The LLM service has been integrated with the backend to provide dynamic quiz generation and answer evaluation. This document describes the integration architecture and how to use it.

## Architecture

### Components

#### 1. LLM Chains (`llm_service/chains/`)
- **quiz_chain.py**: Generates quiz questions for a given topic and difficulty level
  - Input: topic, difficulty level, question count
  - Output: List of Question objects with question_id, prompt, options
  - Uses `quiz_prompt.py` to create the LLM prompt

- **insight_chain.py**: Evaluates student answers and generates insights
  - Input: quiz data, user answers
  - Output: Score and Insights object with strengths, weaknesses, recommendations
  - Uses `insight_prompt.py` to create the LLM prompt

#### 2. Backend Integration (`backend/app/services/quiz_service.py`)
- **generate_quiz()**: 
  - Calls `run_quiz_chain()` to generate questions using LLM
  - Falls back to mock questions if LLM fails
  - Returns `GenerateQuizResponse` with structured questions

- **submit_answers()**:
  - Calls `run_insight_chain()` to evaluate answers and generate insights
  - Falls back to mock insights if LLM fails
  - Returns `SubmitAnswersResponse` with score and insights

#### 3. Prompts (`llm_service/prompts/`)
- **quiz_prompt.py**: Instructs LLM to generate structured JSON with quiz questions
- **insight_prompt.py**: Instructs LLM to evaluate performance and provide insights

#### 4. Parser (`llm_service/utils/parser.py`)
- `safe_json_parse()`: Robustly extracts and parses JSON from LLM responses
- Handles cases where JSON might be embedded in other text

## Data Flow

### Quiz Generation Flow
```
Frontend Request
└─> API: POST /quiz/generate
    └─> Backend: generate_quiz()
        └─> LLM Chain: run_quiz_chain()
            ├─> Prompt: quiz_prompt()
            ├─> LLM API: Generate questions
            └─> Parser: safe_json_parse()
        └─> Response: GenerateQuizResponse with questions
```

### Answer Evaluation Flow
```
Frontend Request
└─> API: POST /quiz/submit
    └─> Backend: submit_answers()
        ├─> LLM Chain: run_insight_chain()
        │   ├─> Prompt: insight_prompt()
        │   ├─> LLM API: Generate insights
        │   └─> Parser: safe_json_parse()
        └─> Backend: record_score() to leaderboard
        └─> Response: SubmitAnswersResponse with score and insights
```

## Configuration

### Environment Variables
- `NVIDIA_API_KEY`: Required for NVIDIA API access in `llm_service/providers/llm_provider.py`

### Python Path
The backend automatically adds `llm_service` to the Python path when importing chains.
If this fails, the backend gracefully falls back to mock data.

## Testing

### Run Tests
```bash
# Run all backend tests
cd backend
python -m pytest tests/

# Run LLM integration tests specifically
python -m pytest tests/test_llm_integration.py -v

# Run with LLM chains available
# (Requires NVIDIA_API_KEY environment variable)
```

### Test Files
- `tests/test_milestone1_flow.py`: Original end-to-end flow test
- `tests/test_llm_integration.py`: New tests for LLM integration
  - Direct chain testing
  - API integration testing
  - End-to-end flow testing

## Error Handling & Fallback

The integration is designed with graceful degradation:

1. **LLM Import Fails**: Backend logs warning and uses mock data
2. **LLM API Call Fails**: Backend logs warning and uses mock data
3. **LLM Response Parsing Fails**: Backend logs warning and uses mock data

This ensures the backend remains functional even if:
- LLM service is not installed
- NVIDIA API key is not configured
- LLM API is temporarily unavailable
- LLM response format is unexpected

## Future Enhancements

1. **Caching**: Cache quiz generation for common topics
2. **Async Processing**: Use task queues for long-running LLM calls
3. **Rate Limiting**: Add rate limiting for LLM API calls
4. **Model Selection**: Support multiple LLM providers
5. **Fine-tuning**: Train models on domain-specific content
6. **Evaluation Metrics**: Track LLM response quality and accuracy

## Integration Checklist

- [x] Create structured quiz prompts
- [x] Create structured insight prompts
- [x] Implement quiz chain with parsing
- [x] Implement insight chain with parsing
- [x] Integrate chains into backend service
- [x] Add error handling and fallback
- [x] Create comprehensive tests
- [ ] Run E2E tests with real LLM API
- [ ] Deploy to production
- [ ] Monitor LLM response quality
