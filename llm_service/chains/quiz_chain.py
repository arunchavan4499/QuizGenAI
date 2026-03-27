from providers.llm_provider import LLMProvider
from prompts.quiz_prompt import quiz_prompt

llm = LLMProvider()

DIFFICULTIES = ("beginner", "intermediate", "advanced")


def _extract_questions_from_result_schema(parsed: dict, difficulty: str) -> list[dict]:
    result_items = parsed.get("result")
    if not isinstance(result_items, list):
        return []

    llm_item = None
    for item in result_items:
        if isinstance(item, dict) and item.get("role") == "llm":
            llm_item = item
            break

    if not isinstance(llm_item, dict):
        return []

    content = llm_item.get("content")
    if not isinstance(content, dict):
        return []

    difficulty_items = content.get(difficulty)
    if not isinstance(difficulty_items, list):
        return []

    mapped_questions: list[dict] = []
    for idx, item in enumerate(difficulty_items, start=1):
        if not isinstance(item, dict):
            continue

        options = item.get("options", [])
        prompt = item.get("question", "")
        correct = item.get("correct", "")

        mapped_questions.append(
            {
                "question_id": f"q{idx}",
                "prompt": prompt,
                "options": options,
                "correct_answer": correct,
                "explanation": item.get("explanation", ""),
            }
        )

    return mapped_questions


def _extract_all_sections_from_result_schema(parsed: dict) -> dict[str, list[dict]]:
    sections: dict[str, list[dict]] = {level: [] for level in DIFFICULTIES}
    for level in DIFFICULTIES:
        sections[level] = _extract_questions_from_result_schema(parsed, level)
    return sections


def run_full_quiz_chain(source_input, question_count=5, use_context=False):
    """Run one LLM call and return all difficulty sections."""
    # difficulty is only used as a hint in the prompt, while output contains all sections.
    messages = quiz_prompt(source_input, "beginner", question_count, use_context=use_context)
    task = "quiz_rag" if use_context else "quiz_topic"
    parsed = llm.generate_json(messages, task=task, retries=1)

    if isinstance(parsed.get("questions"), list):
        # Legacy shape fallback: map same set for every section.
        legacy_questions = parsed.get("questions", [])[:question_count]
        return {level: legacy_questions for level in DIFFICULTIES}

    sections = _extract_all_sections_from_result_schema(parsed)
    return {level: sections[level][:question_count] for level in DIFFICULTIES}

def run_quiz_chain(source_input, difficulty, question_count=5, use_context=False):
    """Run the quiz generation chain and return parsed questions."""
    messages = quiz_prompt(source_input, difficulty, question_count, use_context=use_context)
    task = "quiz_rag" if use_context else "quiz_topic"
    parsed = llm.generate_json(messages, task=task, retries=1)

    # Backward-compatible support for the legacy schema.
    if isinstance(parsed.get("questions"), list):
        return parsed.get("questions", [])[:question_count]

    mapped = _extract_questions_from_result_schema(parsed, difficulty)
    return mapped[:question_count]