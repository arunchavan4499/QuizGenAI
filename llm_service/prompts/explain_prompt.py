def explain_prompt(context, question):
    return [
        {
            "role": "system",
            "content": "You are a friendly tutor. Explain concepts in very simple terms with examples."
        },
        {
            "role": "user",
            "content": f"""
            Context:
            {context}

            Question:
            {question}

            Explain clearly like a teacher.
            """
        }
    ]