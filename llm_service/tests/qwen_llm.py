from openai import OpenAI
from dotenv import load_dotenv
import json
import os
import time

load_dotenv()

client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key="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"
)

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

USER_TOPIC = os.getenv("TOPIC") or input("Enter a topic: ")
MAX_COMPLETION_TOKENS = int(os.getenv("MAX_COMPLETION_TOKENS", "2048"))

USER_PROMPT = f"Generate a quiz on the topic \"{USER_TOPIC}\". The quiz will have 3 sections: beginner, intermediate, advanced. Each section will have 5 questions. Give 4 options per question, and the correct option for each question."

for tokens in [1024, 2048, 4096, 8192]:
    start_time = time.time()
    
    try:
        completion = client.chat.completions.create(
            model="qwen/qwen3.5-397b-a17b",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": USER_PROMPT},
            ],
            temperature=0.2,
            top_p=1,
            max_tokens=tokens,
            stream=False
        )

        response_text = completion.choices[0].message.content

        if response_text is None:
            raise ValueError("LLM response content is None")

        parsed_response = json.loads(response_text)
        
    except json.JSONDecodeError as exc:
        finish_reason = completion.choices[0].finish_reason
        if finish_reason in {"length", "max_tokens"}:
            print(f"Tokens: {tokens} | Status: Truncated (increase max_tokens)")
            continue

        start = response_text.find("{")
        end = response_text.rfind("}")
        if start != -1 and end != -1 and start < end:
            parsed_response = json.loads(response_text[start:end + 1])
        else:
            print(f"Tokens: {tokens} | Status: Invalid JSON format")
            continue

    elapsed_time = time.time() - start_time
    print(f"Tokens: {tokens} | Time: {elapsed_time:.2f}s")
    print(json.dumps(parsed_response, indent=2))