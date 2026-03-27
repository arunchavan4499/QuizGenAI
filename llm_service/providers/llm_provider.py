import os
import logging
import re
import time
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

logger = logging.getLogger(__name__)

class LLMProvider:
    def __init__(self):
        self.qwen_api_key = os.getenv("NVIDIA_API_KEY") or os.getenv("NVCF_API_KEY")
        self.groq_api_key = os.getenv("GROQ_API_KEY")

        self.qwen_url = "https://integrate.api.nvidia.com/v1/chat/completions"
        self.groq_url = "https://api.groq.com/openai/v1/chat/completions"

        # self.qwen_model = os.getenv("QWEN_MODEL", "qwen/qwen3.5-397b-a17b")
        self.qwen_model = os.getenv("QWEN_MODEL", "qwen/qwen3.5-397b-a17b")
        self.groq_model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

        # Default model-routing policy based on benchmark outcomes.
        self.topic_provider = os.getenv("LLM_PROVIDER_TOPIC", "groq").lower()
        self.rag_provider = os.getenv("LLM_PROVIDER_RAG", "qwen").lower()
        self.insight_provider = os.getenv("LLM_PROVIDER_INSIGHTS", "groq").lower()
        self.explain_provider = os.getenv("LLM_PROVIDER_EXPLAIN", "groq").lower()
        self.provider_cooldowns: dict[str, float] = {}

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

    def _is_provider_on_cooldown(self, provider: str) -> bool:
        until = self.provider_cooldowns.get(provider.lower(), 0)
        return until > time.time()

    def _set_provider_cooldown(self, provider: str, seconds: float) -> None:
        # Keep cooldown bounded to avoid very long lockouts from malformed responses.
        safe_seconds = max(5.0, min(float(seconds), 1800.0))
        self.provider_cooldowns[provider.lower()] = time.time() + safe_seconds

    def _extract_retry_seconds(self, text: str) -> float:
        msg = str(text or "")
        # Example: "Please try again in 13m45.984s"
        minute_second_match = re.search(r"(\d+)m(\d+(?:\.\d+)?)s", msg)
        if minute_second_match:
            minutes = float(minute_second_match.group(1))
            seconds = float(minute_second_match.group(2))
            return (minutes * 60.0) + seconds

        # Example: "retry in 45s"
        seconds_match = re.search(r"(\d+(?:\.\d+)?)s", msg)
        if seconds_match:
            return float(seconds_match.group(1))

        return 120.0

    def _request(self, provider: str, messages, stream=False):
        provider = provider.lower()
        timeout = 75  # 75 seconds max for any LLM request
        model = self.groq_model if provider == "groq" else self.qwen_model
        logger.info("LLM request start provider=%s model=%s stream=%s", provider, model, stream)
        print(f"[LLM] start provider={provider} model={model} stream={stream}")
        
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
            try:
                response = requests.post(self.groq_url, headers=headers, json=payload, stream=stream, timeout=timeout)
            except requests.Timeout:
                raise TimeoutError(f"provider=groq model={self.groq_model} timed out after {timeout} seconds.")
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
            try:
                response = requests.post(self.qwen_url, headers=headers, json=payload, stream=stream, timeout=timeout)
            except requests.Timeout:
                raise TimeoutError(f"provider=qwen model={self.qwen_model} timed out after {timeout} seconds.")

        if response.status_code != 200:
            response_text = response.text
            lowered = response_text.lower()
            is_rate_limited = response.status_code == 429 or "rate_limit_exceeded" in lowered
            if is_rate_limited:
                retry_seconds = self._extract_retry_seconds(response_text)
                self._set_provider_cooldown(provider, retry_seconds)
                raise RuntimeError(
                    f"provider={provider} model={model} rate_limited; retry_after_seconds={int(retry_seconds)}; detail={response_text}"
                )

            raise Exception(response_text)

        logger.info("LLM request done provider=%s model=%s status=%s", provider, model, response.status_code)
        print(f"[LLM] done provider={provider} model={model} status={response.status_code}")

        if stream:
            return response.iter_lines()
        return response.json()["choices"][0]["message"]["content"]

    def generate(self, messages, stream=False, task="quiz_topic"):
        preferred = self._provider_for_task(task)
        fallback = "qwen" if preferred == "groq" else "groq"

        if self._is_provider_on_cooldown(preferred):
            logger.info("LLM provider on cooldown task=%s preferred=%s switching_to=%s", task, preferred, fallback)
            print(f"[LLM] cooldown task={task} provider={preferred} switching_to={fallback}")
            preferred = fallback
            fallback = "qwen" if preferred == "groq" else "groq"

        logger.info("LLM routing task=%s preferred=%s fallback=%s", task, preferred, fallback)
        print(f"[LLM] route task={task} preferred={preferred} fallback={fallback}")

        try:
            return self._request(preferred, messages, stream=stream)
        except Exception as preferred_error:
            logger.warning("LLM preferred provider failed task=%s provider=%s error=%s", task, preferred, str(preferred_error))
            print(f"[LLM] preferred_failed task={task} provider={preferred} error={str(preferred_error)}")
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
      