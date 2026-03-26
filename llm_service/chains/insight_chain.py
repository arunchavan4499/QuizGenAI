from providers.llm_provider import LLMProvider
from prompts.insight_prompt import insight_prompt

llm = LLMProvider()

def run_insight_chain(quiz_data, user_answers):
    """Run the insight generation chain and return parsed insights."""
    messages = insight_prompt(quiz_data, user_answers)
    parsed = llm.generate_json(messages, task="insights", retries=2)
    
    return {
        "score": parsed.get("score", 0),
        "insights": parsed.get("insights", {
            "strengths": [],
            "weaknesses": [],
            "recommendations": []
        })
    }