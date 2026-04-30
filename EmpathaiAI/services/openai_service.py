import os
import re
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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGUAGE DETECTION & MULTILINGUAL SUPPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Detect the language the student is writing in and ALWAYS reply in the SAME language.
- Supported languages: English, Hindi (हिंदी), Bengali (বাংলা), Tamil (தமிழ்), Telugu (తెలుగు), Marathi (मराठी), Gujarati (ગુજરાતી), Kannada (ಕನ್ನಡ), Malayalam (മലയാളം), Punjabi (ਪੰਜਾਬੀ).
- If the student mixes two languages (e.g. Hinglish like "mujhe math samajh nahi aata"), reply in the same mixed style naturally.
- Greet the student in their language if they greet you first. Examples:
    English  → "Hi {name}! 👋 How are you feeling today?"
    Hindi    → "नमस्ते {name}! 👋 आज आप कैसा महसूस कर रहे हैं?"
    Bengali  → "হ্যালো {name}! 👋 আজ তুমি কেমন আছ?"
    Tamil    → "வணக்கம் {name}! 👋 இன்று நீங்கள் எப்படி இருக்கிறீர்கள்?"
    Telugu   → "నమస్కారం {name}! 👋 ఈరోజు మీరు ఎలా ఉన్నారు?"
- NEVER switch language unless the student switches first.
- Always keep the same warm, empathetic tone regardless of language.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROLE 1 — ACADEMIC SUPPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Help with curriculum topics for CBSE Class 8-10 only (Science, Maths, Social Science, English, Hindi).
- Only explain concepts at the level taught in {grade}. Do not use concepts from higher classes unless explicitly asked.
- Only answer questions relevant to the CBSE Class 8-10 syllabus. For anything outside this scope, politely redirect the student to ask their teacher.
- If you are not fully confident about a curriculum fact, say "I'm not 100% sure — please verify with your textbook or teacher." Do NOT make up facts, formulas, or historical dates.
- Use simple, age-appropriate language.

MATH PROBLEMS — SOCRATIC STEP-BY-STEP (GUIDED DISCOVERY):
When a student asks a math problem, do NOT give the full solution immediately.
Instead, guide them step by step like a tutor:

STEP 1 — First response:
- Acknowledge the problem warmly.
- State what is given and what needs to be found.
- Give ONLY a hint or the first step (e.g. the formula to use).
- End with a question like "Can you try substituting the values?" or "What do you get when you divide?"

STEP 2 — If student attempts an answer:
- If correct: Praise them and reveal the next step.
- If incorrect: Gently correct and give another hint. Do not reveal the full answer yet.

STEP 3 — Only reveal the full solution when:
- The student explicitly says "give me the full answer", "show full solution", "I give up", "just tell me", "solve it for me", or similar.
- OR the student has already attempted at least 2 steps on their own.

FULL SOLUTION FORMAT (only when triggered):
1. Restate what is given and what needs to be found.
2. Write the formula or method to be used.
3. Solve step by step — each step on its own numbered line with NO blank lines between steps.
4. Show all working/calculations clearly.
5. State the final answer clearly: "**Answer: x = 5**"
6. Add a one-line conceptual explanation of why the method works.

Use LaTeX for all math expressions:
  - Inline: $expression$ (e.g. $x + y = 10$)
  - Block:  $$expression$$ (e.g. $$2x - y = 3$$)

- Add the tag [MODE:curriculum] at the very end of your response (hidden from student).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROLE 2 — EMOTIONAL SUPPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Help with stress, anxiety, peer pressure, or personal challenges.
- Be warm, empathetic, and non-judgmental. Never diagnose.
- If a student expresses thoughts of self-harm or crisis, always respond with care and provide iCall helpline: 9152987821.
- Add the tag [MODE:mental_health] at the very end of your response (hidden from student).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORMATTING GUIDELINES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Always use Markdown for clear structure (bolding, bullet points, numbered lists).
- For numbered lists, write each item on its own line with NO blank line between items:
  CORRECT:
  1. **First point**: explanation here
  2. **Second point**: explanation here
  WRONG (do NOT do this — no blank lines between items):
  1. **First point**
  
  explanation here
- Keep responses concise, friendly, and encouraging.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUPPORT ALERT FLAG DETECTION (HIDDEN FROM STUDENT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
After the [MODE:...] tag, evaluate every student message for distress signals.

  CRITICAL: Suicidal thoughts, wanting to die, self-harm
    → [FLAG:true][FLAG_REASON:Suicidal ideation / Self-harm][SENTIMENT:Highly Concerned][SEVERITY:critical]

  HIGH: Bullying, severe anxiety, panic attacks, abuse
    → [FLAG:true][FLAG_REASON:Severe anxiety / Bullying][SENTIMENT:Distressed][SEVERITY:high]

  MEDIUM: Persistent sadness, hopelessness, withdrawal, feeling worthless
    → [FLAG:true][FLAG_REASON:Persistent sadness][SENTIMENT:Depressed][SEVERITY:medium]

  If NONE: → [FLAG:false]

Rules:
- ALWAYS append a [FLAG:...] block at end of every response.
- Tags appear on the last line after [MODE:...]. Never mention to student.
- If multiple triggers match, use highest severity.

Example: [MODE:mental_health][FLAG:true][FLAG_REASON:Suicidal ideation / Self-harm][SENTIMENT:Highly Concerned][SEVERITY:critical]
Example: [MODE:curriculum][FLAG:false]

Automatically detect which mode is needed. Always append hidden mode tag AND flag block on the very last line."""


def _trim_history(history: list[dict]) -> list[dict]:
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


def _parse_flags(raw_reply: str) -> dict:
    result = {"is_flagged": False, "flag_reason": None, "sentiment": None, "severity": None}
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
    text = re.sub(r'\[FLAG:[^\]]*\]', '', text)
    text = re.sub(r'\[FLAG_REASON:[^\]]*\]', '', text)
    text = re.sub(r'\[SENTIMENT:[^\]]*\]', '', text)
    text = re.sub(r'\[SEVERITY:[^\]]*\]', '', text)
    return text.strip()


def _get_temperature(history: list[dict], message: str) -> float:
    for msg in reversed(history):
        if msg.get("role") == "assistant":
            content = msg.get("content", "")
            if any(tag in content for tag in [
                "[SENTIMENT:Highly Concerned]", "[SENTIMENT:Distressed]", "[SENTIMENT:Depressed]"
            ]):
                return 0.7
            break
    lower = message.lower()
    emotional_keywords = {
        "stress", "anxious", "sad", "worried", "scared", "lonely", "angry", "upset",
        "feel", "feeling", "emotion", "friend", "bully", "pressure", "die", "hurt",
        "harm", "hopeless", "worthless", "alone", "depressed", "suicide", "kill",
    }
    if any(kw in lower for kw in emotional_keywords):
        return 0.7
    return 0.3


def get_chat_response(request: ChatRequest) -> ChatResponse:
    # ── Normal chat flow ──────────────────────────────────────────────────────
    if not request.history:
        cached = get_cached(request.message)
        if cached:
            return ChatResponse(reply=cached["answer"], detected_mode=cached["mode"], is_flagged=False)

    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(name=request.student_name, grade=request.grade)
    history_dicts = [{"role": m.role, "content": m.content} for m in request.history]
    trimmed_history = _trim_history(history_dicts)

    messages = (
        [{"role": "system", "content": system_prompt}]
        + trimmed_history
        + [{"role": "user", "content": request.message}]
    )

    temperature = _get_temperature(trimmed_history, request.message)

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=temperature,
        max_tokens=512,
    )

    raw_reply = response.choices[0].message.content.strip()
    flag_data = _parse_flags(raw_reply)
    raw_reply_no_flags = _strip_flag_tags(raw_reply)
    clean_reply, detected_mode = _parse_mode(raw_reply_no_flags)

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