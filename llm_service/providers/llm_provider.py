import os
import requests
from pathlib import Path
from dotenv import load_dotenv

from utils.parser import safe_json_parse

# Try to find and load .env from multiple locations
def load_environment():
    """Load environment variables from .env file in various locations."""
    possible_paths = [
        Path(__file__).parent.parent.parent / ".env",  # Root level
        Path(__file__).parent.parent / ".env",  # llm_service level
        Path.cwd() / ".env",  # Current working directory
    ]
    
    for path in possible_paths:
        if path.exists():
            load_dotenv(path)
            print(f"Loaded .env from: {path}")
            return
    
    print("Warning: No .env file found. Checking for NVIDIA_API_KEY in environment...")

load_environment()

class LLMProvider:
    def __init__(self):
        self.qwen_api_key = os.getenv("NVIDIA_API_KEY") or os.getenv("NVCF_API_KEY")
        self.groq_api_key = os.getenv("GROQ_API_KEY")

        self.qwen_url = "https://integrate.api.nvidia.com/v1/chat/completions"
        self.groq_url = "https://api.groq.com/openai/v1/chat/completions"

        self.qwen_model = os.getenv("QWEN_MODEL", "qwen/qwen3.5-397b-a17b")
        self.groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

        # Default model-routing policy based on benchmark outcomes.
        self.topic_provider = os.getenv("LLM_PROVIDER_TOPIC", "groq").lower()
        self.rag_provider = os.getenv("LLM_PROVIDER_RAG", "qwen").lower()
        self.insight_provider = os.getenv("LLM_PROVIDER_INSIGHTS", "groq").lower()
        self.explain_provider = os.getenv("LLM_PROVIDER_EXPLAIN", "groq").lower()

        if not self.qwen_api_key and not self.groq_api_key:
            raise ValueError(
                "No LLM API key found. Set at least one of NVIDIA_API_KEY/NVCF_API_KEY or GROQ_API_KEY."
            )

    def _provider_for_task(self, task: str) -> str:
        task = task.lower()
        if task in {"quiz_rag", "rag"}:
            return self.rag_provider
        if task in {"insights", "insight"}:
            return self.insight_provider
        if task in {"explain", "explanation"}:
            return self.explain_provider
        return self.topic_provider

    def _request(self, provider: str, messages, stream=False):
        provider = provider.lower()
        if provider == "groq":
            if not self.groq_api_key:
                raise ValueError("GROQ_API_KEY is not set.")
            headers = {
                "Authorization": f"Bearer {self.groq_api_key}",
                "Accept": "text/event-stream" if stream else "application/json",
            }
            payload = {
                "model": self.groq_model,
                "messages": messages,
                "max_tokens": 4096,
                "temperature": 0.2,
                "top_p": 1,
                "stream": stream,
            }
            response = requests.post(self.groq_url, headers=headers, json=payload, stream=stream)
        else:
            if not self.qwen_api_key:
                raise ValueError("NVIDIA_API_KEY/NVCF_API_KEY is not set.")
            headers = {
                "Authorization": f"Bearer {self.qwen_api_key}",
                "Accept": "text/event-stream" if stream else "application/json",
            }
            payload = {
                "model": self.qwen_model,
                "messages": messages,
                "max_tokens": 4096,
                "temperature": 0.6,
                "top_p": 0.95,
                "stream": stream,
            }
            response = requests.post(self.qwen_url, headers=headers, json=payload, stream=stream)

        if response.status_code != 200:
            raise Exception(response.text)

        if stream:
            return response.iter_lines()
        return response.json()["choices"][0]["message"]["content"]

    def generate(self, messages, stream=False, task="quiz_topic"):
        preferred = self._provider_for_task(task)
        fallback = "qwen" if preferred == "groq" else "groq"

        try:
            return self._request(preferred, messages, stream=stream)
        except Exception:
            if fallback == preferred:
                raise
            return self._request(fallback, messages, stream=stream)

    def generate_json(self, messages, task="quiz_topic", retries=2):
        attempt_messages = list(messages)
        for _ in range(retries + 1):
            raw = self.generate(attempt_messages, stream=False, task=task)
            parsed = safe_json_parse(raw)
            if isinstance(parsed, dict) and "error" not in parsed:
                return parsed

            attempt_messages = attempt_messages + [
                {
                    "role": "user",
                    "content": "Return only strict valid JSON. Do not include markdown fences or extra text.",
                }
            ]

        raise ValueError("Model failed to return valid JSON after retries.")
      