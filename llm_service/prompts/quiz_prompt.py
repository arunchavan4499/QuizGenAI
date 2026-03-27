def quiz_prompt(source_input, difficulty, question_count=5, use_context=False):
    """Generate a prompt for creating quiz questions at a specific difficulty level."""
    schema_instructions = f"""Respond only in valid JSON object with the following format:
{{
  "result": [
    {{
      "role": "llm",
      "content": {{
        "beginner": [
          {{"question": "...", "options": ["...", "...", "...", "..."], "correct": "..."}}
        ],
        "intermediate": [
          {{"question": "...", "options": ["...", "...", "...", "..."], "correct": "..."}}
        ],
        "advanced": [
          {{"question": "...", "options": ["...", "...", "...", "..."], "correct": "..."}}
        ]
      }}
    }}
  ]
}}

STRICT REQUIREMENTS:
- Generate all three sections: beginner, intermediate, advanced.
- Each section must have exactly 5 questions with 4 options each.
- Ensure one objectively correct answer per question.
- Prioritize clarity and accuracy.
- Output valid JSON only. No markdown.
"""

    if use_context:
        return [
            {
                "role": "system",
                "content": "You are an expert teacher. Use ONLY the provided document context as source of truth. If context is insufficient, still remain context-grounded and avoid hallucination.",
            },
            {
                "role": "user",
                "content": f"""Using only the document context below, generate a complete 3-section quiz.

DOCUMENT CONTEXT:
{source_input}

{schema_instructions}""",
            },
        ]

    return [
        {
            "role": "system",
            "content": "You are an expert teacher who creates well-structured multiple-choice quiz questions."
        },
        {
            "role": "user",
            "content": f"""Topic: {source_input}

Generate a complete 3-section quiz for this topic.

{schema_instructions}"""
        }
    ]