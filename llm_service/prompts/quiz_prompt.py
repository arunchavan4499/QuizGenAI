def quiz_prompt(source_input, difficulty, question_count=5, use_context=False):
    """Generate a prompt for creating quiz questions at a specific difficulty level."""
    if use_context:
        return [
            {
                "role": "system",
                "content": "You are an expert teacher. Use ONLY the provided document context as source of truth. If the context is insufficient, still stay within context and do not hallucinate. Always respond with valid JSON only, no extra text.",
            },
            {
                "role": "user",
                "content": f"""Using only the document context below, generate {question_count} multiple-choice questions at {difficulty} difficulty level.

DOCUMENT CONTEXT:
{source_input}

STRICT FORMAT: Respond ONLY with valid JSON (no markdown, no extra text):
{{
  "questions": [
    {{
      "question_id": "q1",
      "prompt": "Clear question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A",
      "explanation": "One-paragraph explanation grounded in the document context"
    }}
  ]
}}

Requirements:
- question_id: q1, q2, q3, etc.
- prompt: Should start with ({difficulty.title()})
- options: Exactly 4 options
- correct_answer: Must be one of the 4 options verbatim
- explanation: Explain why the correct option is correct, strictly grounded in the context""",
            },
        ]

    return [
        {
            "role": "system",
            "content": "You are an expert teacher who creates well-structured multiple-choice quiz questions. Always respond with valid JSON only, no additional text."
        },
        {
            "role": "user",
            "content": f"""Generate {question_count} multiple-choice questions about "{source_input}" at {difficulty} difficulty level.

STRICT FORMAT: Respond ONLY with valid JSON (no markdown, no extra text):
{{
  "questions": [
    {{
      "question_id": "q1",
      "prompt": "Clear question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A",
      "explanation": "One-paragraph explanation"
    }}
  ]
}}

Requirements:
- question_id: q1, q2, q3, etc.
- prompt: Should start with ({difficulty.title()}) and include the topic
- options: Exactly 4 options
- correct_answer: Must be one of the 4 options verbatim
- explanation: Explain why the correct option is correct"""
        }
    ]