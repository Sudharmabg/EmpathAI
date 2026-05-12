import os
import re
import random
import logging
import tiktoken
from openai import OpenAI
from dotenv import load_dotenv
from models.schemas import ChatRequest, ChatResponse
from services.cache_service import get_cached, add_to_cache

load_dotenv()
logger = logging.getLogger("openai_service")
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

_enc = None
HISTORY_TOKEN_BUDGET = 2000

def get_encoder():
    global _enc
    if _enc is None:
        import tiktoken
        _enc = tiktoken.get_encoding("cl100k_base")
    return _enc

# ── Casual message handler (zero OpenAI tokens used) ─────────────────────────

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
        ]
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
        ]
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
        ]
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
        ]
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
        ]
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
        ]
    },
}


def _detect_casual(message: str) -> str | None:
    """
    Returns the category name if the message is casual/greeting.
    Returns None if the message should go to OpenAI.
    Only triggers for short messages (8 words or less) to avoid
    catching mixed messages like 'I am fine but I need math help'.
    """
    lower = message.lower().strip()
    if len(lower.split()) > 8:
        return None
    for category, data in CASUAL_PATTERNS.items():
        for keyword in data["keywords"]:
            if keyword in lower:
                return category
    return None


def _get_casual_response(category: str, name: str) -> str:
    """Pick a random response for the detected casual category."""
    responses = CASUAL_PATTERNS[category]["responses"]
    template = random.choice(responses)
    return template.format(name=name)


# ── System prompt ─────────────────────────────────────────────────────────────

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
  - Inline: $x+y=10$ (No spaces between $ and the expression).
  - Block:  
    $$
    expression
    $$
    (Put block math on its own line with $$ on separate lines).

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
  WRONG (do NOT do this):
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


# ── Main entry point ──────────────────────────────────────────────────────────
def get_chat_response(request: ChatRequest) -> ChatResponse:
    # ── Step 1: Casual message check (skip if images are attached) ───────────
    has_images = bool(request.images and len(request.images) > 0) or bool(request.image_base64)
    if not has_images:
        casual_category = _detect_casual(request.message)
        if casual_category:
            logger.info(f"Casual message detected: '{casual_category}' for student {request.student_name}")
            casual_reply = _get_casual_response(casual_category, request.student_name)
            return ChatResponse(
                reply=casual_reply,
                detected_mode="casual",
                is_flagged=False,
            )

    # ── Step 2: Cache check for curriculum questions ──────────────────────────
    if not request.history:
        cached = get_cached(request.message)
        if cached:
            logger.info(f"Cache hit for message from {request.student_name}")
            return ChatResponse(
                reply=cached["answer"],
                detected_mode=cached["mode"],
                is_flagged=False,
            )
        else:
            logger.debug(f"Cache miss for message from {request.student_name}")

    # ── Step 3: Call OpenAI for academic/emotional messages ───────────────────
    logger.info(f"Calling OpenAI for {request.student_name}...")
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
        name=request.student_name,
        grade=request.grade
    )
    history_dicts = [{"role": m.role, "content": m.content} for m in request.history]
    trimmed_history = _trim_history(history_dicts)

    # Build content for the current user message
    user_content = [{"type": "text", "text": request.message or "Please analyse this image and help me."}]
    
    # Handle multiple images from request.images (stashed)
    if request.images:
        for img_base64 in request.images:
            url = img_base64 if img_base64.startswith("data:") else f"data:image/jpeg;base64,{img_base64}"
            user_content.append({
                "type": "image_url",
                "image_url": {"url": url, "detail": "high"}
            })
            
    # Handle single image from upstream fields
    if request.image_base64 and request.image_mime_type:
        user_content.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:{request.image_mime_type};base64,{request.image_base64}",
                "detail": "high",
            }
        })

    has_images = len(user_content) > 1

    messages = (
        [{"role": "system", "content": system_prompt}]
        + trimmed_history
        + [{"role": "user", "content": user_content}]
    )

    temperature = _get_temperature(trimmed_history, request.message)

    # Use gpt-4o-mini for text, gpt-4o for vision (better image understanding)
    model = "gpt-4o" if has_images else "gpt-4o-mini"

    response = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=2048,
    )
    logger.info(f"OpenAI call completed for {request.student_name}")

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