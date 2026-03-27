from flask import Flask, request, jsonify
from flask_cors import CORS 
import requests

app = Flask(__name__)
CORS(app)

API_KEY = "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"
API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

system_prompt = {
    "role": "system",
    "content": "You are a supportive, fun, and caring friend who chats casually like a human. Use emojis and keep it natural."
}
@app.route("/")
def home():
    return "Friend Chatbot is running 👋 Go to /chat with a POST request"


@app.route("/chat", methods=["POST"])
def chat():
    user_message = request.json.get("message", "")

    messages = [
        system_prompt,
        {"role": "user", "content": user_message}
    ]

    headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
    data = {"model": "meta/llama-3.1-70b-instruct", "messages": messages}  # ✅ NVIDIA supports this model

    try:
        response = requests.post(API_URL, headers=headers, json=data)

        response.raise_for_status()
        reply = response.json()["choices"][0]["message"]["content"]
    except Exception as e:
        reply = f"⚠️ Error: {e}"

    return jsonify({"reply": reply})

if __name__ == "__main__":
    print("🚀 Friend chatbot running on http://127.0.0.1:5000")
    app.run(port=5000, debug=True)
