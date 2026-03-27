from providers.llm_provider import LLMProvider
from prompts.explain_prompt import explain_prompt

llm = LLMProvider()

def run_explain_chain(context, question, task="explain"):
    messages = explain_prompt(context, question)
    return llm.generate(messages, task=task)