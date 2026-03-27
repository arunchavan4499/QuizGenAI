def explain_prompt(context, question):
    return [
        {
            "role": "system",
            "content": "You are a friendly tutor. Explain concepts in simple terms with examples. Keep output non-interactive: do not ask follow-up questions, do not ask the learner what to do next. Classify the request as Coding or Non-coding internally, but do not print section labels like Category or Knowledge Pyramid. Text style must be plain text only: do not use markdown formatting such as **bold**, *italic*, __underline__, backticks, headings, or decorative symbols."
        },
        {
            "role": "user",
            "content": f"""
            Context:
            {context}

            Question:
            {question}

            Explain clearly like a teacher.
            Output format requirements:
            - Start with a short overview paragraph.
            - Then provide 4 to 8 clear key learning points.
            - Then provide 2 to 4 concise revision notes.
            - If the topic is coding, include one short code example and explain the expected output or behavior in plain text.
            - Do not print labels like "Category", "Short overview", "Key learning points", "Knowledge Pyramid", or numbered template steps.
            - Do not include follow-up questions.
            """
        }
    ]