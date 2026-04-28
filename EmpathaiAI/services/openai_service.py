import os
import tiktoken
from openai import OpenAI
from dotenv import load_dotenv
from models.schemas import ChatRequest, ChatResponse
from services.cache_service import get_cached, add_to_cache

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

_enc = tiktoken.get_encoding("cl100k_base")
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

SUPPORT ALERT — FLAG DETECTION (HIDDEN FROM STUDENT):
After the [MODE:...] tag, you MUST evaluate every student message for distress signals.
If ANY of the following are present, append the flag tags described below on the SAME last line:

  CRITICAL triggers (severity=critical):
    - Suicidal thoughts, wanting to die, self-harm, ending one's life
    → [FLAG:true][FLAG_REASON:Suicidal ideation / Self-harm][SENTIMENT:Highly Concerned][SEVERITY:critical]

  HIGH triggers (severity=high):
    - Bullying (physical/verbal/cyber), severe anxiety, panic attacks, abuse (physical/emotional/sexual)
    → [FLAG:true][FLAG_REASON:Severe anxiety / Bullying][SENTIMENT:Distressed][SEVERITY:high]

  MEDIUM triggers (severity=medium):
    - Persistent sadness, hopelessness, withdrawal from activities, feeling worthless, extreme loneliness
    → [FLAG:true][FLAG_REASON:Persistent sadness][SENTIMENT:Depressed][SEVERITY:medium]

  If NONE of the above are present:
    → [FLAG:false]

Rules:
- ALWAYS append a [FLAG:...] block at the end of every response — no exceptions.
- The flag tags must appear on the last line, after the [MODE:...] tag.
- Never mention these tags to the student. They are invisible metadata.
- If multiple triggers match, use the highest severity level.

-If its math prob give step by step solution and explain it in points.
-how to show images

Example last line (critical):  [MODE:mental_health][FLAG:true][FLAG_REASON:Suicidal ideation / Self-harm][SENTIMENT:Highly Concerned][SEVERITY:critical]
Example last line (not flagged): [MODE:curriculum][FLAG:false]

FORMATTING GUIDELINES:
- Always use Markdown for clear structure (bolding, bullet points, headers).
- Use LaTeX for mathematical expressions:
    - Use single dollar signs ($) for inline math (e.g. $x + y = 10$).
    - Use double dollar signs ($$) for block math (e.g. $$2x - y = 3$$).
- Use spacing between paragraphs to avoid text blocks.
- Keep responses concise, friendly, and encouraging.

Automatically detect which mode is needed from the student's message.
Always append the hidden mode tag AND flag block on the very last line of your response."""


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
    """Extract and strip the [MODE:...] tag from the raw reply."""
    if "[MODE:mental_health]" in raw_reply:
        return raw_reply.replace("[MODE:mental_health]", "").strip(), "mental_health"
    return raw_reply.replace("[MODE:curriculum]", "").strip(), "curriculum"


def _parse_flags(raw_reply: str) -> dict:
    """
    Extract support-alert flag tags from the raw AI reply.

    Expected tags on the last line (after [MODE:...]):
      [FLAG:true][FLAG_REASON:...][SENTIMENT:...][SEVERITY:...]
      or
      [FLAG:false]

    Returns a dict with keys: is_flagged, flag_reason, sentiment, severity.
    All values are None when FLAG:false.
    """
    import re

    result = {
        "is_flagged": False,
        "flag_reason": None,
        "sentiment": None,
        "severity": None,
    }

    flag_match = re.search(r'\[FLAG:(true|false)\]', raw_reply, re.IGNORECASE)
    if not flag_match or flag_match.group(1).lower() != "true":
        return result

    result["is_flagged"] = True

    reason_match = re.search(r'\[FLAG_REASON:([^\]]+)\]', raw_reply)
    if reason_match:
        result["flag_reason"] = reason_match.group(1).strip()

    sentiment_match = re.search(r'\[SENTIMENT:([^\]]+)\]', raw_reply)
    if sentiment_match:
        result["sentiment"] = sentiment_match.group(1).strip()

    severity_match = re.search(r'\[SEVERITY:(critical|high|medium)\]', raw_reply, re.IGNORECASE)
    if severity_match:
        result["severity"] = severity_match.group(1).lower()

    return result


def _strip_flag_tags(text: str) -> str:
    """Remove all flag metadata tags from the text shown to the student."""
    import re
    # Strip all [FLAG...] tags
    text = re.sub(r'\[FLAG:[^\]]*\]', '', text)
    text = re.sub(r'\[FLAG_REASON:[^\]]*\]', '', text)
    text = re.sub(r'\[SENTIMENT:[^\]]*\]', '', text)
    text = re.sub(r'\[SEVERITY:[^\]]*\]', '', text)
    return text.strip()


def get_chat_response(request: ChatRequest) -> ChatResponse:
    # Only attempt cache for standalone curriculum questions (no active conversation)
    if not request.history:
        cached = get_cached(request.message)
        if cached:
            return ChatResponse(
                reply=cached["answer"],
                detected_mode=cached["mode"],
                is_flagged=False,
            )

    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(name=request.student_name, grade=request.grade)

    history_dicts = [{"role": m.role, "content": m.content} for m in request.history]
    trimmed_history = _trim_history(history_dicts)

    messages = (
        [{"role": "system", "content": system_prompt}]
        + trimmed_history
        + [{"role": "user", "content": request.message}]
    )

    # Use low temperature for academic (deterministic facts), higher for emotional (natural tone)
    lower_msg = request.message.lower()
    emotional_keywords = {
        "stress", "anxious", "sad", "worried", "scared", "lonely", "angry", "upset",
        "feel", "feeling", "emotion", "friend", "bully", "pressure", "die", "hurt",
        "harm", "hopeless", "worthless", "alone", "depressed", "suicide", "kill",
    }
    is_likely_emotional = any(kw in lower_msg for kw in emotional_keywords)
    temperature = 0.7 if is_likely_emotional else 0.2

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=temperature,
        max_tokens=512,
    )

    raw_reply = response.choices[0].message.content.strip()

    # ── Step 1: Parse flag metadata BEFORE stripping tags ────────────────────
    flag_data = _parse_flags(raw_reply)

    # ── Step 2: Strip flag tags from raw reply before mode parsing ───────────
    raw_reply_no_flags = _strip_flag_tags(raw_reply)

    # ── Step 3: Parse mode and get clean student-facing reply ─────────────────
    clean_reply, detected_mode = _parse_mode(raw_reply_no_flags)

    # Cache only curriculum answers (emotional / flagged responses must always be fresh)
    if detected_mode == "curriculum" and not request.history and not flag_data["is_flagged"]:
        add_to_cache(request.message, clean_reply, detected_mode)

    return ChatResponse(
        reply=clean_reply,
        detected_mode=detected_mode,
        is_flagged=flag_data["is_flagged"],
        flag_reason=flag_data["flag_reason"],
        sentiment=flag_data["sentiment"],
        severity=flag_data["severity"],
    )