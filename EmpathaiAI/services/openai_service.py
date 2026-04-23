import os
import tiktoken
from openai import OpenAI
from dotenv import load_dotenv
from models.schemas import ChatRequest, ChatResponse
from services.cache_service import get_cached, add_to_cache

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

_enc = tiktoken.encoding_for_model("gpt-4o-mini")
HISTORY_TOKEN_BUDGET = 2000

SYSTEM_PROMPT_TEMPLATE = """You are EmpathAI Assistant, a caring and intelligent chatbot for school students.

The student's name is {name}. They are in {grade} (CBSE board).

You have two roles:
1. ACADEMIC: Help with curriculum topics for CBSE Class 8–10 only (Science, Maths, Social Science, English, Hindi).
   - Only explain concepts at the level taught in {grade}. Do not use concepts from higher classes unless explicitly asked.
   - Only answer questions relevant to the CBSE Class 8–10 syllabus. For anything outside this scope, politely redirect the student to ask their teacher.
   - If you are not fully confident about a curriculum fact, say "I'm not 100% sure — please verify with your textbook or teacher." Do NOT make up facts, formulas, or historical dates.
   - Use simple, age-appropriate language. Give step-by-step explanations.
   - Add the tag [MODE:curriculum] at the very end of your response (hidden from student).
2. EMOTIONAL SUPPORT: Help with stress, anxiety, peer pressure, or personal challenges.
   - Be warm, empathetic, and non-judgmental. Never diagnose.
   - If a student expresses thoughts of self-harm or crisis, always respond with care and provide iCall helpline: 9152987821.
   - Add the tag [MODE:mental_health] at the very end of your response (hidden from student).

FORMATTING GUIDELINES:
- Always use Markdown for clear structure (bolding, bullet points, headers).
- Use LaTeX for mathematical expressions:
    - Use single dollar signs ($) for inline math (e.g. $x + y = 10$).
    - Use double dollar signs ($$) for block math (e.g. $$2x - y = 3$$).
- Use spacing between paragraphs to avoid text blocks.
- Keep responses concise, friendly, and encouraging.

Automatically detect which mode is needed from the student's message.
Always append the hidden mode tag on the very last line of your response."""


def _trim_history(history: list[dict]) -> list[dict]:
    """Keep as many recent messages as fit within HISTORY_TOKEN_BUDGET tokens."""
    total = 0
    trimmed = []
    for msg in reversed(history):
        tokens = len(_enc.encode(msg["content"]))
        if total + tokens > HISTORY_TOKEN_BUDGET:
            break
        trimmed.insert(0, msg)
        total += tokens
    return trimmed


def _parse_mode(raw_reply: str) -> tuple[str, str]:
    if "[MODE:mental_health]" in raw_reply:
        return raw_reply.replace("[MODE:mental_health]", "").strip(), "mental_health"
    return raw_reply.replace("[MODE:curriculum]", "").strip(), "curriculum"


def get_chat_response(request: ChatRequest) -> ChatResponse:
    # Only attempt cache for standalone curriculum questions (no active conversation)
    if not request.history:
        cached = get_cached(request.message)
        if cached:
            return ChatResponse(reply=cached["answer"], detected_mode=cached["mode"])

    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(name=request.student_name, grade=request.grade)

    history_dicts = [{"role": m.role, "content": m.content} for m in request.history]
    trimmed_history = _trim_history(history_dicts)

    messages = (
        [{"role": "system", "content": system_prompt}]
        + trimmed_history
        + [{"role": "user", "content": request.message}]
    )

    # Use low temperature for academic (deterministic facts), higher for emotional (natural tone)
    # We do a quick pre-check on keywords to pick temperature before the main call
    lower_msg = request.message.lower()
    emotional_keywords = {"stress", "anxious", "sad", "worried", "scared", "lonely", "angry", "upset", "feel", "feeling", "emotion", "friend", "bully", "pressure"}
    is_likely_emotional = any(kw in lower_msg for kw in emotional_keywords)
    temperature = 0.7 if is_likely_emotional else 0.2

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=temperature,
        max_tokens=512,
    )

    raw_reply = response.choices[0].message.content.strip()
    clean_reply, detected_mode = _parse_mode(raw_reply)

    # Cache only curriculum answers (emotional responses must always be fresh)
    if detected_mode == "curriculum" and not request.history:
        add_to_cache(request.message, clean_reply, detected_mode)

    return ChatResponse(reply=clean_reply, detected_mode=detected_mode)
