from providers.llm_provider import LLMProvider

llm = LLMProvider()

response = llm.generate([
    {"role": "user", "content": "Explain AI in one simple sentence"}
])

print("\n✅ LLM RESPONSE:\n", response)