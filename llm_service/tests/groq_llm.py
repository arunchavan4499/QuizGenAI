import time

from dotenv import load_dotenv
from groq import Groq
import json
import os

load_dotenv()

SYSTEM_PROMPT = """Respond only in valid JSON object with the following format:
{"result": [
    {"role": "user" | "llm" | "tool", "content": "..."}
]
}

STRICT REQUIREMENTS:
- You MUST generate the full quiz.
- The "llm" role MUST contain all 3 sections: beginner, intermediate, advanced.
- Each section MUST have exactly 5 questions.
- Each question MUST have 4 options and 1 correct answer.
- Do NOT return only the user message.
- Do NOT return empty or partial output.
- Output must be valid JSON only. No markdown, no explanations.
"""

client = Groq()
models = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"]

USER_TOPIC = os.getenv("TOPIC") or input("Enter a topic: ")
MAX_COMPLETION_TOKENS = int(os.getenv("MAX_COMPLETION_TOKENS", "2048"))
USER_PROMPT = f"Generate a quiz on the topic \"{USER_TOPIC}\". The quiz will have 3 sections: beginner, intermediate, advanced. Each section will have 5 questions. Give 4 options per question, and the correct option for each question."

for token in [1024, 2048, 4096, 8192]:

    start_time = time.time()


    completion = client.chat.completions.create(
        model=models[1],
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": USER_PROMPT},
        ],
        temperature=0.2,
        max_completion_tokens=token,
        top_p=1,
        stream=False,
    )

    response_text = completion.choices[0].message.content
    if response_text is None:
        raise ValueError("LLM response content is None")

    try:
        parsed_response = json.loads(response_text)
    except json.JSONDecodeError as exc:
        finish_reason = completion.choices[0].finish_reason
        if finish_reason in {"length", "max_tokens"}:
            raise ValueError(
                "The model response was truncated before completing valid JSON. "
                "Increase max_completion_tokens or reduce response size."
            ) from exc

        # Fallback: parse the first top-level JSON object if the model adds extra text.
        start = response_text.find("{")
        end = response_text.rfind("}")
        if start != -1 and end != -1 and start < end:
            parsed_response = json.loads(response_text[start : end + 1])
        else:
            raise

    elapsed_time = time.time() - start_time
    print(f"Tokens: {token} | Time: {elapsed_time:.2f}s")
    print(json.dumps(parsed_response, indent=2))