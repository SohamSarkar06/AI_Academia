from openai import OpenAI
import json

client = OpenAI(api_key="YOUR_OPENAI_API_KEY")

def extract_academic_intent(text: str):
    prompt = f"""
You are an academic assistant.

User request:
{text}

Return JSON with:
- subject (academic domain)
- topics (precise concepts)
- search_query (optimized for finding study materials)

Rules:
- No generic labels
- No conversational phrases
- Focus on notes, lectures, PDFs, courses
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json"}
    )

    return json.loads(response.choices[0].message.content)
