# Claude Starter

## Setup
1. Copy the example env:
   cp .env.example .env

2. Add your Anthropic API key to `.env`

3. Activate the venv:
   source venv/bin/activate

4. Run the app:
   python app.py

## Test
curl -X POST http://127.0.0.1:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hi, I need an AI receptionist for my plumbing business."
  }'
