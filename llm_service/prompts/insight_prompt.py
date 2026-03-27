def insight_prompt(quiz_data, user_answers):
    """Generate a prompt for analyzing student quiz performance."""
    return [
        {
            "role": "system",
            "content": "You are an expert educational analyst. Analyze quiz performance and provide actionable insights. Always respond with valid JSON only, no additional text."
        },
        {
            "role": "user",
            "content": f"""Analyze the student's quiz performance and provide detailed insights.

Quiz Questions:
{quiz_data}

Student's Answers:
{user_answers}

STRICT FORMAT: Respond ONLY with valid JSON (no markdown, no extra text):
{{
  "score": 85.5,
  "insights": {{
    "strengths": ["List of 2-3 specific strengths identified from correct answers"],
    "weaknesses": ["List of 2-3 specific areas for improvement from incorrect answers"],
    "recommendations": ["List of 3-4 specific actionable tips for improvement"]
  }}
}}

Requirements:
- score: Percentage (0-100) based on correct answers
- strengths: Be specific about what the student did well
- weaknesses: Be constructive and specific about areas needing improvement
- recommendations: Provide actionable, specific advice
- Text style: plain text only. Do NOT use markdown formatting like **bold**, *italic*, __underline__, backticks, headings, or bullet symbols inside strings."""
        }
    ]