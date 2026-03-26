from providers.llm_provider import LLMProvider
from prompts.quiz_prompt import quiz_prompt

llm = LLMProvider()

def run_quiz_chain(source_input, difficulty, question_count=5, use_context=False):
    """Run the quiz generation chain and return parsed questions."""
    messages = quiz_prompt(source_input, difficulty, question_count, use_context=use_context)
    task = "quiz_rag" if use_context else "quiz_topic"
    parsed = llm.generate_json(messages, task=task, retries=2)

    return parsed.get("questions", [])