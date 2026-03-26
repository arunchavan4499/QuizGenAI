import json
import os
import re
import time
from typing import Any, Dict, List, Tuple

from dotenv import load_dotenv
from groq import Groq
from openai import OpenAI


load_dotenv()

TOPIC = os.getenv("TOPIC", "Linked List")
QWEN_MODEL = "qwen/qwen3.5-397b-a17b"
GROQ_MODEL = "llama-3.3-70b-versatile"


def load_qwen_api_key() -> str:
    env_key = os.getenv("NVIDIA_API_KEY") or os.getenv("NVCF_API_KEY")
    if env_key:
        return env_key

    with open("qwen_llm.py", "r", encoding="utf-8") as f:
        content = f.read()

    match = re.search(r'api_key\s*=\s*"([^"]+)"', content)
    if not match:
        raise RuntimeError(
            "Could not find NVIDIA key in env or qwen_llm.py. Set NVIDIA_API_KEY in .env."
        )
    return match.group(1)


def safe_json_loads(text: str) -> Tuple[Any, bool]:
    try:
        return json.loads(text), True
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and start < end:
            try:
                return json.loads(text[start : end + 1]), True
            except json.JSONDecodeError:
                pass
    return text, False


def request_groq(system_prompt: str, user_prompt: str, max_tokens: int = 4096) -> Dict[str, Any]:
    client = Groq()
    start = time.time()
    completion = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
        top_p=1,
        max_completion_tokens=max_tokens,
        stream=False,
    )
    elapsed = time.time() - start
    raw = completion.choices[0].message.content or ""
    parsed, is_json = safe_json_loads(raw)
    return {
        "raw": raw,
        "parsed": parsed,
        "is_json": is_json,
        "latency_sec": elapsed,
        "finish_reason": completion.choices[0].finish_reason,
    }


def request_qwen(system_prompt: str, user_prompt: str, max_tokens: int = 4096) -> Dict[str, Any]:
    client = OpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=load_qwen_api_key(),
    )
    start = time.time()
    completion = client.chat.completions.create(
        model=QWEN_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
        top_p=1,
        max_tokens=max_tokens,
        stream=False,
    )
    elapsed = time.time() - start
    raw = completion.choices[0].message.content or ""
    parsed, is_json = safe_json_loads(raw)
    return {
        "raw": raw,
        "parsed": parsed,
        "is_json": is_json,
        "latency_sec": elapsed,
        "finish_reason": completion.choices[0].finish_reason,
    }


def score_explanation(resp: Dict[str, Any]) -> Dict[str, Any]:
    score = 0
    notes: List[str] = []

    if resp["is_json"] and isinstance(resp["parsed"], dict):
        score += 2
    else:
        notes.append("Not valid JSON")
        return {"score": score, "notes": notes}

    data = resp["parsed"]
    required = ["overview", "key_points", "example", "common_mistakes"]
    present = 0
    for key in required:
        if key in data:
            present += 1
    score += present

    if isinstance(data.get("key_points"), list) and len(data["key_points"]) >= 4:
        score += 2
    else:
        notes.append("key_points too short")

    if isinstance(data.get("overview"), str) and len(data["overview"].split()) >= 60:
        score += 1
    else:
        notes.append("overview brief")

    return {"score": score, "notes": notes}


def _extract_quiz_content(parsed: Any) -> Any:
    if isinstance(parsed, dict) and "result" in parsed and isinstance(parsed["result"], list):
        for item in parsed["result"]:
            if isinstance(item, dict) and item.get("role") == "llm":
                return item.get("content")
    if isinstance(parsed, dict):
        return parsed
    return None


def score_quiz(resp: Dict[str, Any]) -> Dict[str, Any]:
    score = 0
    notes: List[str] = []

    if resp["is_json"]:
        score += 2
    else:
        notes.append("Not valid JSON")
        return {"score": score, "notes": notes}

    content = _extract_quiz_content(resp["parsed"])
    if not isinstance(content, dict):
        notes.append("Quiz content is not structured object")
        return {"score": score, "notes": notes}

    sections = ["beginner", "intermediate", "advanced"]
    if all(section in content for section in sections):
        score += 2
    else:
        notes.append("Missing one or more sections")

    question_count_ok = True
    options_ok = True
    for section in sections:
        items = content.get(section, [])
        if not isinstance(items, list) or len(items) != 5:
            question_count_ok = False
            continue
        for q in items:
            if not isinstance(q, dict):
                options_ok = False
                continue
            options = q.get("options")
            if not isinstance(options, list) or len(options) != 4:
                options_ok = False

    if question_count_ok:
        score += 3
    else:
        notes.append("Expected 5 questions per section")

    if options_ok:
        score += 2
    else:
        notes.append("Expected 4 options per question")

    return {"score": score, "notes": notes}


def score_rag(resp: Dict[str, Any], required_terms: List[str]) -> Dict[str, Any]:
    score = 0
    notes: List[str] = []

    if not resp["is_json"]:
        notes.append("Not valid JSON")
        return {"score": score, "notes": notes}

    parsed = resp["parsed"]
    if not isinstance(parsed, dict):
        notes.append("Response is not JSON object")
        return {"score": score, "notes": notes}

    has_expl = isinstance(parsed.get("explanation"), dict)
    has_quiz = isinstance(parsed.get("quiz"), dict)

    if has_expl:
        score += 2
    else:
        notes.append("Missing structured explanation")

    if has_quiz:
        score += 2
    else:
        notes.append("Missing structured quiz")

    content_text = json.dumps(parsed).lower()
    matched = sum(1 for term in required_terms if term.lower() in content_text)
    score += min(matched, 4)
    notes.append(f"Grounding terms matched: {matched}/{len(required_terms)}")

    if has_quiz:
        q_eval = score_quiz(
            {
                "is_json": True,
                "parsed": {"result": [{"role": "llm", "content": parsed["quiz"]}]},
            }
        )
        score += min(q_eval["score"], 4)
        if q_eval["notes"]:
            notes.extend([f"quiz: {n}" for n in q_eval["notes"]])

    return {"score": score, "notes": notes}


def main() -> None:
    explanation_system = (
        "Return only valid JSON with keys: overview, key_points, example, common_mistakes. "
        "key_points must be an array with at least 4 concise bullets."
    )
    explanation_user = f"Explain {TOPIC} for a beginner-to-intermediate learner in a practical way."

    quiz_system = (
        "Return only valid JSON in the form: "
        '{"result":[{"role":"llm","content":{"beginner":[],"intermediate":[],"advanced":[]}}]}. '
        "Each section must have exactly 5 questions. Each question must have question, options(4), correct."
    )
    quiz_user = (
        f"Generate a quiz on {TOPIC} with beginner, intermediate, and advanced sections. "
        "Each section needs exactly 5 MCQs with 4 options and one correct answer."
    )

    notes = (
        "Linked list notes:\n"
        "1) Singly linked list nodes store data and a next pointer.\n"
        "2) Doubly linked list nodes store data, prev, and next pointers.\n"
        "3) Insert at head is O(1). Random access is O(n).\n"
        "4) Floyd's tortoise-hare detects cycles in O(n) time and O(1) space.\n"
        "5) A sentinel (dummy) node can simplify edge-case insert/delete logic.\n"
        "6) LRU cache is commonly implemented with hash map + doubly linked list.\n"
    )
    rag_system = (
        "Return only valid JSON with keys: explanation, quiz. "
        "explanation must include keys: overview, key_points, limitations. "
        "quiz must have beginner/intermediate/advanced with exactly 5 MCQs per section, each with 4 options and correct. "
        "Use only the supplied notes for facts."
    )
    rag_user = (
        "Using ONLY the notes below, first explain the topic and then generate the quiz.\n\n"
        f"{notes}"
    )

    required_terms = [
        "tortoise",
        "sentinel",
        "random access",
        "hash map",
        "doubly linked list",
    ]

    providers = {
        "groq": request_groq,
        "qwen": request_qwen,
    }

    results: Dict[str, Any] = {}

    for name, requester in providers.items():
        provider_res: Dict[str, Any] = {}

        exp = requester(explanation_system, explanation_user, max_tokens=4096)
        quiz = requester(quiz_system, quiz_user, max_tokens=4096)
        rag = requester(rag_system, rag_user, max_tokens=8192)

        provider_res["explanation"] = {
            "latency_sec": exp["latency_sec"],
            "finish_reason": exp["finish_reason"],
            "score": score_explanation(exp),
            "sample": exp["raw"][:500],
        }
        provider_res["quiz"] = {
            "latency_sec": quiz["latency_sec"],
            "finish_reason": quiz["finish_reason"],
            "score": score_quiz(quiz),
            "sample": quiz["raw"][:500],
        }
        provider_res["rag"] = {
            "latency_sec": rag["latency_sec"],
            "finish_reason": rag["finish_reason"],
            "score": score_rag(rag, required_terms),
            "sample": rag["raw"][:500],
        }

        results[name] = provider_res

    with open("llm_benchmark_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
