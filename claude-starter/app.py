import os
from flask import Flask, request, jsonify
from dotenv import load_dotenv
import anthropic

load_dotenv()

api_key = os.getenv("ANTHROPIC_API_KEY")
model_id = os.getenv("MODEL_ID", "claude-3-7-sonnet-latest")
port = int(os.getenv("PORT", "3000"))

if not api_key:
    raise ValueError("Missing ANTHROPIC_API_KEY in .env")

client = anthropic.Anthropic(api_key=api_key)

app = Flask(__name__)

SYSTEM_PROMPT = """
You are an AI lead qualification assistant for a marketing and AI automation company.

Your job:
- answer questions clearly
- qualify the lead
- collect missing info when needed
- stay concise
- do not invent pricing
"""

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    user_message = data.get("message", "").strip()
    history = data.get("history", [])

    if not user_message:
        return jsonify({"error": "Missing 'message'"}), 400

    messages = []

    for item in history:
        role = item.get("role")
        content = item.get("content")
        if role in {"user", "assistant"} and content:
            messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": user_message})

    try:
        response = client.messages.create(
            model=model_id,
            max_tokens=500,
            system=SYSTEM_PROMPT,
            messages=messages
        )

        text_parts = []
        for block in response.content:
            if getattr(block, "type", None) == "text":
                text_parts.append(block.text)

        reply = "\n".join(text_parts).strip()

        return jsonify({
            "reply": reply,
            "usage": {
                "input_tokens": getattr(response.usage, "input_tokens", None),
                "output_tokens": getattr(response.usage, "output_tokens", None)
            }
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=port, debug=True)
