import logging
import os
import re
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from graph.state import ChatState

load_dotenv()

logger = logging.getLogger("response_generator")


SYSTEM_INSTRUCTION = """You are ChatBuddy, a warm and intelligent AI study assistant for school students on the MyMercurie platform.

LANGUAGE RULES:
- Detect the language the student is using and respond in the SAME language.
- If the student writes in Hindi, respond in Hindi.
- If the student writes in English, respond in English.
- If the student mixes Hindi and English (Hinglish), respond in Hinglish.
- Never force English if the student is not using English.
- Never mention that you are GPT or an OpenAI product.
- Never say "As an AI language model..."
- Keep responses SHORT and easy to read for school students.
- For schedule, progress, and goal questions: use bullet points, not paragraphs.
- For curriculum questions: use numbered steps or bullet points where possible.
- Maximum 2-3 sentences before switching to a list.
- Never write long paragraphs — break everything into short, scannable points.

TASK SCHEDULING & PLANNER RULES:
- If the student asks you to add, create, edit, delete, complete, or modify any planner task or schedule item, you MUST politely explain that you cannot edit their planner directly.
- Direct them to go to the "Schedule Planner" tab and use the "Schedule Assistant" (or Planner AI panel) to manage their tasks.

ACADEMIC RULES (for CURRICULUM intent):
- Only explain concepts at the student's specified grade level (CBSE).
- Use simple, age-appropriate language.
- For math problems, guide step by step rather than giving the full answer immediately.
- Use LaTeX for math ONLY with these exact delimiters:
  - Inline math: $expression$ (e.g. $0.86 \\times 100 = 86\\%$)
  - Display/block math: $$expression$$ on its own line
  - NEVER use \\[ \\], \\( \\), or plain bracket notation like [ 0.86 × 100 = 86% ].
  - NEVER write math equations as plain text outside of LaTeX delimiters.

EMOTIONAL SUPPORT RULES:
- Always acknowledge feelings first.
- Be non-judgmental and empathetic.
- If crisis signals detected, provide iCall helpline: 9152987821.

HIDDEN TAGS — append on the very last line only, no label text, no explanation:
[MODE:curriculum] or [MODE:mental_health] or [MODE:casual]
[FLAG:false] or [FLAG:true][FLAG_REASON:reason][SENTIMENT:label][SEVERITY:medium/high/critical]

Always append both MODE and FLAG tags on the very last line. Never write the words Academic, Emotional, Casual, No distress, or Distress detected."""


def _build_context_message(state: ChatState) -> str:
    name                = state.get("student_name", "Student")
    grade               = state.get("grade", "8th Standard")
    intent              = state.get("intent", "CURRICULUM")
    emotional_state     = state.get("emotional_state", "NEUTRAL")
    academic_pressure   = state.get("academic_pressure", "LOW")
    schedule_summary    = state.get("schedule_context_summary", "No schedule data")
    preferred_study_time= state.get("preferred_study_time", "Not set")
    completed_week      = state.get("tasks_completed_this_week", 0)
    total_week          = state.get("tasks_total_this_week", 0)
    mood_pattern        = state.get("mood_pattern_summary", "")
    assessment_context  = state.get("assessment_context_summary", "")
    sleep_hours         = state.get("sleep_hours")
    sleep_quality       = state.get("sleep_quality")
    current_mood        = state.get("current_mood")

    tone_map = {
        "POSITIVE":   "The student is in a good mood. Be encouraging, energetic, and motivating.",
        "NEUTRAL":    "The student seems calm. Be helpful, clear, and friendly.",
        "STRESSED":   "The student seems stressed. Be gentle, supportive, and patient. Acknowledge feelings first.",
        "DISTRESSED": "The student is distressed. Prioritise empathy FIRST before any academic content.",
    }
    tone_instruction = tone_map.get(emotional_state, "Be helpful and friendly.")

    schedule_instruction = ""
    if intent in ("SCHEDULE_QUERY", "SCHEDULE_ACTION", "PROGRESS_QUERY"):
        sleep_line = ""
        if sleep_hours is not None:
            quality_str = f" ({sleep_quality} quality)" if sleep_quality else ""
            sleep_line = f"\nSleep last night: {sleep_hours} hrs{quality_str} — factor this into study plan suggestions if low."
        mood_line = f"\nCurrent mood: {current_mood}" if current_mood else ""

        schedule_instruction = f"""
SCHEDULE CONTEXT (use this to give a specific personalised answer):
{schedule_summary}
Preferred Study Time: {preferred_study_time}
Week Progress: {completed_week}/{total_week} tasks completed this week
Academic Pressure Level: {academic_pressure}{sleep_line}{mood_line}

When answering schedule questions:
- Reference the student's actual tasks, exams, and goals
- Respect their preferred study time window
- If behind on tasks, acknowledge it gently and suggest a realistic catch-up plan
- If exam pressure is HIGH, prioritise exam subject revision
- If sleep was poor or under 6 hours, suggest lighter study sessions and breaks
- Keep suggestions specific and actionable
- If they ask you to add, edit, or delete tasks/study sessions, politely state that you cannot do it here and direct them to the Schedule Planner's Schedule Assistant.
"""

    emotional_context = ""
    if intent == "EMOTIONAL_SUPPORT" or emotional_state in ("STRESSED", "DISTRESSED"):
        sleep_line = ""
        if sleep_hours is not None:
            quality_str = f" ({sleep_quality} quality)" if sleep_quality else ""
            sleep_line = f"\nSleep last night: {sleep_hours} hrs{quality_str}"
        mood_line = f"\nCurrent mood: {current_mood}" if current_mood else ""

        emotional_context = f"""
EMOTIONAL CONTEXT (use this to personalise empathy):
Mood pattern (last 7 days): {mood_pattern}
Latest assessment: {assessment_context}{sleep_line}{mood_line}

When responding to emotional messages:
- Acknowledge their feelings first
- If mood pattern shows recurring negative emotions, gently note you've noticed they've been having a hard week
- If assessment shows high anxiety/stress, use grounding language
- If sleep was less than 6 hours or poor quality, gently acknowledge that tiredness can affect how we feel
- If current mood is negative (sad/anxious/angry), lead with empathy before anything else
- NEVER mention "I noticed your mood logs say..." — instead say things like "It sounds like things have been heavy lately"
- Keep responses warm but not overly clinical
"""

    context_prompt = f"""Student Name: {name}
Grade: {grade} (CBSE Board)
Detected Intent: {intent}
Student Emotional State: {emotional_state}

TONE INSTRUCTION:
{tone_instruction}
{schedule_instruction}
{emotional_context}"""

    return context_prompt


def _fix_latex_delimiters(text: str) -> str:
    text = re.sub(r'\\\[(.*?)\\\]', lambda m: f'$${m.group(1)}$$', text, flags=re.DOTALL)
    text = re.sub(r'\\\((.*?)\\\)', lambda m: f'${m.group(1)}$',   text, flags=re.DOTALL)
    return text


def _parse_mode(raw_reply: str) -> tuple:
    if "[MODE:mental_health]" in raw_reply:
        return raw_reply.replace("[MODE:mental_health]", "").strip(), "mental_health"
    if "[MODE:casual]" in raw_reply:
        return raw_reply.replace("[MODE:casual]", "").strip(), "casual"
    return raw_reply.replace("[MODE:curriculum]", "").strip(), "curriculum"


def _parse_flags(raw_reply: str) -> dict:
    result = {"is_flagged": False, "flag_reason": None, "sentiment": None, "severity": None}
    flag_match = re.search(r'\[FLAG:(true|false)\]', raw_reply, re.IGNORECASE)
    if not flag_match or flag_match.group(1).lower() != "true":
        return result
    result["is_flagged"] = True
    reason_match   = re.search(r'\[FLAG_REASON:([^\]]+)\]', raw_reply)
    sentiment_match= re.search(r'\[SENTIMENT:([^\]]+)\]',   raw_reply)
    severity_match = re.search(r'\[SEVERITY:(critical|high|medium)\]', raw_reply, re.IGNORECASE)
    if reason_match:    result["flag_reason"] = reason_match.group(1).strip()
    if sentiment_match: result["sentiment"]   = sentiment_match.group(1).strip()
    if severity_match:  result["severity"]    = severity_match.group(1).lower()
    return result


def _strip_all_tags(text: str) -> str:
    text = re.sub(r'\[MODE:[^\]]*\]',       '', text)
    text = re.sub(r'\[FLAG:[^\]]*\]',       '', text)
    text = re.sub(r'\[FLAG_REASON:[^\]]*\]','', text)
    text = re.sub(r'\[SENTIMENT:[^\]]*\]',  '', text)
    text = re.sub(r'\[SEVERITY:[^\]]*\]',   '', text)
    return text.strip()


def response_generator(state: ChatState) -> ChatState:
    if state.get("is_crisis"):
        logger.info("Response generator skipped — crisis already handled")
        return state

    try:
        # ── Build message list ─────────────────────────────────────────────────
        messages = [
            SystemMessage(content=SYSTEM_INSTRUCTION),
            SystemMessage(content=_build_context_message(state))
        ]

        # Use chat_history from LangGraph checkpointer (replaces old manual history)
        for msg in state.get("chat_history", []):
            role    = msg.get("role")    if isinstance(msg, dict) else msg.role
            content = msg.get("content") if isinstance(msg, dict) else msg.content
            if role == "user":
                messages.append(HumanMessage(content=content))
            else:
                messages.append(AIMessage(content=content))

        # ── Build current user message (with optional images) ─────────────────
        user_content   = []
        message_text   = state.get("message", "")
        if message_text:
            user_content.append({"type": "text", "text": message_text})

        images = state.get("images", [])
        for img in images:
            url = img if img.startswith("data:") else f"data:image/jpeg;base64,{img}"
            user_content.append({
                "type":      "image_url",
                "image_url": {"url": url, "detail": "high"}
            })

        image_base64     = state.get("image_base64")
        image_mime_type  = state.get("image_mime_type")
        if image_base64 and image_mime_type:
            user_content.append({
                "type":      "image_url",
                "image_url": {
                    "url":    f"data:{image_mime_type};base64,{image_base64}",
                    "detail": "high"
                }
            })

        has_images = len(user_content) > 1

        if len(user_content) == 1:
            messages.append(HumanMessage(content=user_content[0]["text"]))
        else:
            messages.append(HumanMessage(content=user_content))

        model_name = "gpt-4o" if has_images else "gpt-4o-mini"

        llm = ChatOpenAI(
            model=      model_name,
            temperature=0.5,
            api_key=    os.getenv("OPENAI_API_KEY"),
            max_tokens= 2048,
        )

        from graph.utils.llm_retry import with_retry
        response  = with_retry(lambda: llm.invoke(messages))
        raw_reply = response.content.strip()

        flag_data     = _parse_flags(raw_reply)
        raw_no_flags  = _strip_all_tags(raw_reply)
        clean_reply, detected_mode = _parse_mode(raw_no_flags)

        clean_reply = _fix_latex_delimiters(clean_reply)

        # ── Prepend empathy prefix if validator added one ──────────────────────
        if state.get("needs_empathy_prefix") and state.get("empathy_prefix"):
            clean_reply = f"{state['empathy_prefix']}\n\n{clean_reply}"
            logger.info("Empathy prefix prepended to response")

        # ── Metric: check for fast path override/misclassification ──────────────
        if state.get("fast_path"):
            has_empathy_phrase = any(phrase in clean_reply.lower() for phrase in [
                "i'm sorry", "i hear you", "sounds tough", "sounds hard", "understand how you feel",
                "feel sad", "don't worry", "grounding", "take a deep breath"
            ])
            if detected_mode == "mental_health" or has_empathy_phrase:
                logger.warning(
                    "[METRIC] fast_path_override | Fast path was taken but response included "
                    "emotional indicators (mode=%s, has_empathy_phrase=%s) for message: '%s'",
                    detected_mode, has_empathy_phrase, message_text
                )

        #  Update chat_history with this turn so checkpointer saves it
        updated_history = list(state.get("chat_history", []))
        updated_history.append({"role": "user",      "content": message_text})
        updated_history.append({"role": "assistant",  "content": clean_reply})

        # Keep only last 20 messages (10 turns) to avoid token overflow
        if len(updated_history) > 20:
            updated_history = updated_history[-20:]

        state["chat_history"]  = updated_history
        state["reply"]         = clean_reply
        state["detected_mode"] = detected_mode
        state["is_flagged"]    = flag_data["is_flagged"]
        state["flag_reason"]   = flag_data["flag_reason"]
        state["sentiment"]     = flag_data["sentiment"]
        state["severity"]      = flag_data["severity"]

        logger.info(
            "Response generated | mode=%s | flagged=%s | model=%s | history_turns=%d",
            detected_mode,
            flag_data["is_flagged"],
            model_name,
            len(updated_history) // 2
        )

    except Exception as e:
        logger.error("Response generation failed: %s", str(e), exc_info=True)
        state["reply"]        = (
            "I'm sorry, I'm having a little trouble right now. "
            "Please try again in a moment!"
        )
        state["detected_mode"] = "curriculum"
        state["is_flagged"]    = False

    return state