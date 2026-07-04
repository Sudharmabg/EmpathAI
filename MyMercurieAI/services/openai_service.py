"""
openai_service.py  —  OpenAI integration with streaming + async support
────────────────────────────────────────────────────────────────────────
Changes from original:
  • get_chat_response()       — unchanged sync path (used by LangGraph nodes)
  • stream_chat_response()    — NEW async generator; yields text tokens via
                                Server-Sent Events as they arrive from OpenAI,
                                so the user sees the first word in ~300 ms.
  • _build_messages()         — extracted helper shared by both paths so there
                                is no duplication of the message-building logic.
  • AsyncOpenAI client        — used only for the streaming path so the sync
                                LangGraph pipeline is not affected.
"""

from __future__ import annotations

import asyncio
import logging
import os
import random
import re
from typing import AsyncIterator
import time

import tiktoken
from dotenv import load_dotenv
from openai import AsyncOpenAI, OpenAI
from services.metrics_service import record_success, record_failure

from models.schemas import ChatRequest, ChatResponse
from services.cache_service import add_to_cache, get_cached

load_dotenv()
logger = logging.getLogger("openai_service")

# ── Clients ───────────────────────────────────────────────────────────────────
_api_key = os.getenv("OPENAI_API_KEY")
client       = OpenAI(api_key=_api_key)          # sync  — LangGraph pipeline
async_client = AsyncOpenAI(api_key=_api_key)     # async — streaming endpoint

# ── Token budget ──────────────────────────────────────────────────────────────
_enc = None
HISTORY_TOKEN_BUDGET = 2000


def get_encoder():
    global _enc
    if _enc is None:
        _enc = tiktoken.get_encoding("cl100k_base")
    return _enc


# ── Casual message handler (zero OpenAI tokens) ───────────────────────────────

CASUAL_PATTERNS = {
    "greeting": {
        "keywords": [
            "good morning", "good evening", "good afternoon", "good night",
            "gm", "gn", "hey", "hello", "hi", "hii", "hiii", "hola",
            "namaste", "namaskar", "sat sri akal", "jai hind",
            "assalamualaikum", "salam", "adab",
            "suprabhat", "shubh prabhat", "shubh sandhya",
        ],
        "responses": [
            "Hey {name}! 😊 Great to see you! How are you doing today?",
            "Hello {name}! 👋 Hope you're having a wonderful day! What can I help you with?",
            "Hi {name}! 🌟 Lovely to hear from you! Are you here to study or just chat?",
            "Hey there, {name}! 😄 How's your day going so far?",
        ],
    },
    "how_are_you": {
        "keywords": [
            "how are you", "how r u", "how are u", "hru", "how do you do",
            "how's it going", "how is it going", "whats up", "what's up",
            "wassup", "sup", "you ok", "are you ok", "you good", "are you good",
            "kaisa hai", "kaise ho", "kya haal", "theek ho",
        ],
        "responses": [
            "I'm doing great, {name}! Thanks for asking 😊 I'm always ready to help you learn or chat. How about you?",
            "I'm wonderful, {name}! 🌟 Always happy when a student checks in. How are YOU doing today?",
            "All good here, {name}! 😄 Ready to help with studies or just have a chat. What's on your mind?",
        ],
    },
    "i_am_fine": {
        "keywords": [
            "i am fine", "i'm fine", "im fine", "i am good", "i'm good", "im good",
            "i am okay", "i'm okay", "im okay", "i am ok", "i'm ok", "doing well",
            "doing good", "all good", "all is well", "main theek hoon", "theek hoon",
            "mein thik hun", "sab theek",
        ],
        "responses": [
            "That's great to hear, {name}! 😊 I'm glad you're doing well. Ready to learn something today?",
            "Wonderful! 🌟 Happy to know you're fine, {name}! What would you like to do — study or chat?",
            "So good to hear that, {name}! 😄 Feeling good is the perfect time to learn something new!",
        ],
    },
    "thanks": {
        "keywords": [
            "thank you", "thanks", "thankyou", "thank u", "thx", "ty",
            "shukriya", "dhanyavaad", "dhanyawad",
            "bahut shukriya", "bahut dhanyavaad",
        ],
        "responses": [
            "You're welcome, {name}! 😊 Always happy to help. Anything else you need?",
            "My pleasure, {name}! 🌟 That's what I'm here for. Feel free to ask anything anytime!",
            "Anytime, {name}! 😄 Don't hesitate to come back whenever you need help!",
        ],
    },
    "bye": {
        "keywords": [
            "bye", "goodbye", "good bye", "see you", "see ya", "cya", "take care",
            "alvida", "phir milenge", "phir milte hain", "tata",
            "ok bye", "okay bye", "byee", "byeee",
        ],
        "responses": [
            "Goodbye, {name}! 👋 Take care and keep learning! See you next time 😊",
            "Bye, {name}! 🌟 It was great chatting with you. Come back anytime!",
            "See you soon, {name}! 😄 Remember, I'm always here if you need help. Take care!",
        ],
    },
    "compliment": {
        "keywords": [
            "you are great", "you're great", "you are awesome", "you're awesome",
            "you are amazing", "you're amazing", "you are helpful", "you're helpful",
            "you are good", "you're good", "i like you", "best chatbot",
            "you are the best", "you're the best",
        ],
        "responses": [
            "Aww, thank you so much, {name}! 😊 That really made my day! I'm here to do my best for you!",
            "That's so kind of you, {name}! 🌟 I love helping students like you. Keep up the great work!",
            "You're too sweet, {name}! 😄 I'm just happy I could help. Now let's keep learning together!",
        ],
    },
}


def _detect_casual(message: str) -> str | None:
    lower = message.lower().strip()
    if len(lower.split()) > 8:
        return None
    for category, data in CASUAL_PATTERNS.items():
        for keyword in data["keywords"]:
            if keyword in lower:
                return category
    return None


def _get_casual_response(category: str, name: str) -> str:
    template = random.choice(CASUAL_PATTERNS[category]["responses"])
    return template.format(name=name)


# ── System prompt ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT_TEMPLATE = """You are MyMercurie Assistant, a caring and intelligent chatbot for school students.

The student's name is {name}. They are in {grade} (CBSE board).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGUAGE DETECTION & MULTILINGUAL SUPPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Detect the language the student is writing in and ALWAYS reply in the SAME language.
- Supported languages: English, Hindi (हिंदी), Bengali (বাংলা), Tamil (தமிழ்), Telugu (తెలుగు), Marathi (मराठी), Gujarati (ગુજરાતી), Kannada (ಕನ್ನಡ), Malayalam (മലയാളം), Punjabi (ਪੰਜਾਬੀ).
- If the student mixes two languages (e.g. Hinglish like "mujhe math samajh nahi aata"), reply in the same mixed style naturally.
- NEVER switch language unless the student switches first.
- Always keep the same warm, empathetic tone regardless of language.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROLE 1 — ACADEMIC SUPPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Help with curriculum topics for CBSE Class 8-10 only (Science, Maths, Social Science, English, Hindi).
- Only explain concepts at the level taught in {grade}.
- If not fully confident about a curriculum fact, say "I'm not 100% sure — please verify with your textbook or teacher."
- Use simple, age-appropriate language.

MATH PROBLEMS — SOCRATIC STEP-BY-STEP (GUIDED DISCOVERY):
When a student asks a math problem, do NOT give the full solution immediately.
Guide them step by step. Only reveal the full solution when explicitly asked.

Use LaTeX for all math expressions:
  - Inline: $x+y=10$
  - Block: $$expression$$

- Add the tag [MODE:curriculum] at the very end of your response (hidden from student).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROLE 2 — EMOTIONAL SUPPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Help with stress, anxiety, peer pressure, or personal challenges.
- Be warm, empathetic, and non-judgmental. Never diagnose.
- If a student expresses thoughts of self-harm or crisis, provide iCall helpline: 9152987821.
- Add the tag [MODE:mental_health] at the very end of your response.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORMATTING GUIDELINES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Always use Markdown for clear structure.
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

Always append [FLAG:...] block at end of every response on the very last line."""


# ── Helpers ───────────────────────────────────────────────────────────────────

def _trim_history(history: list[dict]) -> list[dict]:
    total = 0
    trimmed = []
    for msg in reversed(history):
        tokens = len(get_encoder().encode(msg["content"]))
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
    for key, pattern in [
        ("flag_reason", r'\[FLAG_REASON:([^\]]+)\]'),
        ("sentiment",   r'\[SENTIMENT:([^\]]+)\]'),
    ]:
        m = re.search(pattern, raw_reply)
        if m:
            result[key] = m.group(1).strip()
    m = re.search(r'\[SEVERITY:(critical|high|medium)\]', raw_reply, re.IGNORECASE)
    if m:
        result["severity"] = m.group(1).lower()
    return result


def _strip_flag_tags(text: str) -> str:
    for pat in [r'\[FLAG:[^\]]*\]', r'\[FLAG_REASON:[^\]]*\]',
                r'\[SENTIMENT:[^\]]*\]', r'\[SEVERITY:[^\]]*\]']:
        text = re.sub(pat, '', text)
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
    emotional_keywords = {
        "stress", "anxious", "sad", "worried", "scared", "lonely", "angry", "upset",
        "feel", "feeling", "emotion", "friend", "bully", "pressure", "die", "hurt",
        "harm", "hopeless", "worthless", "alone", "depressed", "suicide", "kill",
    }
    if any(kw in message.lower() for kw in emotional_keywords):
        return 0.7
    return 0.3


def _build_messages(request: ChatRequest) -> tuple[list[dict], str, bool]:
    """
    Build the OpenAI messages list, select the model, and return
    (messages, model_name, has_images).  Shared by sync and async paths.
    """
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
        name=request.student_name,
        grade=request.grade,
    )
    history_dicts  = [{"role": m.role, "content": m.content} for m in (request.history or [])]
    trimmed        = _trim_history(history_dicts)

    user_content: list[dict] = [
        {"type": "text", "text": request.message or "Please analyse this image and help me."}
    ]

    for img in (request.images or []):
        url = img if img.startswith("data:") else f"data:image/jpeg;base64,{img}"
        user_content.append({"type": "image_url", "image_url": {"url": url, "detail": "high"}})

    if request.image_base64 and request.image_mime_type:
        user_content.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:{request.image_mime_type};base64,{request.image_base64}",
                "detail": "high",
            },
        })

    has_images = len(user_content) > 1
    model      = "gpt-4o" if has_images else "gpt-4o-mini"

    messages = (
        [{"role": "system", "content": system_prompt}]
        + trimmed
        + [{"role": "user", "content": user_content}]
    )
    return messages, model, has_images


# ── Sync path — used by LangGraph pipeline (unchanged behaviour) ──────────────

def get_chat_response(request: ChatRequest) -> ChatResponse:
    has_images = bool(request.images) or bool(request.image_base64)

    # Fast path: casual
    if not has_images:
        cat = _detect_casual(request.message)
        if cat:
            logger.info("Casual '%s' for %s", cat, request.student_name)
            return ChatResponse(
                reply=_get_casual_response(cat, request.student_name),
                detected_mode="casual",
                is_flagged=False,
            )

    # Fast path: cache
    if not request.history:
        cached = get_cached(request.message)
        if cached:
            logger.info("Cache hit for %s", request.student_name)
            return ChatResponse(
                reply=cached["answer"],
                detected_mode=cached["mode"],
                is_flagged=False,
            )

    # OpenAI call
    logger.info("Calling OpenAI (sync) for %s", request.student_name)
    messages, model, has_images = _build_messages(request)
    temperature = _get_temperature(
        [{"role": m.role, "content": m.content} for m in (request.history or [])],
        request.message,
    )

    start_time = time.time()
    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=2048,
        )
        duration_ms = (time.time() - start_time) * 1000.0
        record_success(duration_ms)
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000.0
        record_failure(duration_ms)
        raise e
    raw_reply      = response.choices[0].message.content.strip()
    flag_data      = _parse_flags(raw_reply)
    raw_no_flags   = _strip_flag_tags(raw_reply)
    clean_reply, detected_mode = _parse_mode(raw_no_flags)

    if detected_mode == "curriculum" and not request.history and not flag_data["is_flagged"]:
        add_to_cache(request.message, clean_reply, detected_mode)

    return ChatResponse(
        reply=clean_reply,
        detected_mode=detected_mode,
        **flag_data,
    )


# ── Async streaming path — used by /chat/stream endpoint ─────────────────────

async def stream_chat_response(request: ChatRequest) -> AsyncIterator[str]:
    """
    Async generator that yields SSE-formatted strings:

        data: <token>\n\n          — a text chunk
        data: [DONE]\n\n           — end of stream
        data: [META]{...}\n\n      — final JSON with mode / flag metadata

    The caller (chat router) forwards these directly to the browser.
    Streaming means the user sees the first word in ~300 ms regardless
    of how long the full response takes.
    """
    has_images = bool(request.images) or bool(request.image_base64)

    # ── Fast path: casual (no OpenAI at all) ─────────────────────────────────
    if not has_images:
        cat = _detect_casual(request.message)
        if cat:
            casual_reply = _get_casual_response(cat, request.student_name)
            # Simulate streaming for casual so the frontend code path is uniform
            words = casual_reply.split(" ")
            for i, word in enumerate(words):
                chunk = word + ("" if i == len(words) - 1 else " ")
                yield f"data: {chunk}\n\n"
                await asyncio.sleep(0)   # yield control to event loop
            yield 'data: [META]{"detected_mode":"casual","is_flagged":false}\n\n'
            yield "data: [DONE]\n\n"
            return

    # ── Fast path: semantic cache ─────────────────────────────────────────────
    if not request.history:
        # Run blocking cache lookup in thread pool (non-blocking for event loop)
        loop = asyncio.get_event_loop()
        cached = await loop.run_in_executor(None, get_cached, request.message)
        if cached:
            logger.info("Cache hit (stream) for %s", request.student_name)
            words = cached["answer"].split(" ")
            for i, word in enumerate(words):
                chunk = word + ("" if i == len(words) - 1 else " ")
                yield f"data: {chunk}\n\n"
                await asyncio.sleep(0)
            import json
            meta = json.dumps({"detected_mode": cached["mode"], "is_flagged": False})
            yield f"data: [META]{meta}\n\n"
            yield "data: [DONE]\n\n"
            return

    # ── OpenAI streaming call ─────────────────────────────────────────────────
    logger.info("Calling OpenAI (stream) for %s", request.student_name)
    messages, model, _ = _build_messages(request)
    history_dicts = [{"role": m.role, "content": m.content} for m in (request.history or [])]
    temperature   = _get_temperature(history_dicts, request.message)

    full_reply = ""

    start_time = time.time()
    try:
        async with await async_client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=2048,
            stream=True,
        ) as stream:
            async for chunk in stream:
                delta = chunk.choices[0].delta.content if chunk.choices else None
                if delta:
                    full_reply += delta
                    # SSE-escape newlines inside the token so the protocol isn't broken
                    safe = delta.replace("\n", "\\n")
                    yield f"data: {safe}\n\n"
        duration_ms = (time.time() - start_time) * 1000.0
        record_success(duration_ms)
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000.0
        record_failure(duration_ms)
        raise e

    # ── Post-processing (after stream completes) ──────────────────────────────
    import json

    flag_data             = _parse_flags(full_reply)
    raw_no_flags          = _strip_flag_tags(full_reply)
    clean_reply, mode     = _parse_mode(raw_no_flags)

    if mode == "curriculum" and not request.history and not flag_data["is_flagged"]:
        # Cache in background — don't block the stream
        loop = asyncio.get_event_loop()
        loop.run_in_executor(None, add_to_cache, request.message, clean_reply, mode)

    meta = {
        "detected_mode": mode,
        "is_flagged":    flag_data["is_flagged"],
        "flag_reason":   flag_data.get("flag_reason"),
        "sentiment":     flag_data.get("sentiment"),
        "severity":      flag_data.get("severity"),
    }
    yield f"data: [META]{json.dumps(meta)}\n\n"
    yield "data: [DONE]\n\n"