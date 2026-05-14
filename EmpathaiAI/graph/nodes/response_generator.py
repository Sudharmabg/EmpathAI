import logging
import os
import re
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from graph.state import ChatState

load_dotenv()

logger = logging.getLogger("response_generator")


def _build_system_prompt(state: ChatState) -> str:
    name = state.get("student_name", "Student")
    grade = state.get("grade", "8th Standard")
    intent = state.get("intent", "CURRICULUM")
    emotional_state = state.get("emotional_state", "NEUTRAL")
    academic_pressure = state.get("academic_pressure", "LOW")
    schedule_summary = state.get("schedule_context_summary", "No schedule data")
    preferred_study_time = state.get("preferred_study_time", "Not set")
    completed_week = state.get("tasks_completed_this_week", 0)
    total_week = state.get("tasks_total_this_week", 0)

    tone_map = {
        "POSITIVE": "The student is in a good mood. Be encouraging, energetic, and motivating.",
        "NEUTRAL": "The student seems calm. Be helpful, clear, and friendly.",
        "STRESSED": "The student seems stressed. Be gentle, supportive, and patient. Acknowledge feelings first.",
        "DISTRESSED": "The student is distressed. Prioritise empathy FIRST before any academic content.",
    }
    tone_instruction = tone_map.get(emotional_state, "Be helpful and friendly.")

    schedule_instruction = ""
    if intent in ("SCHEDULE_QUERY", "SCHEDULE_ACTION", "PROGRESS_QUERY"):
        schedule_instruction = f"""
SCHEDULE CONTEXT (use this to give a specific personalised answer):
{schedule_summary}
Preferred Study Time: {preferred_study_time}
Week Progress: {completed_week}/{total_week} tasks completed this week
Academic Pressure Level: {academic_pressure}

When answering schedule questions:
- Reference the student's actual tasks, exams, and goals
- Respect their preferred study time window
- If behind on tasks, acknowledge it gently and suggest a realistic catch-up plan
- If exam pressure is HIGH, prioritise exam subjects
- Keep suggestions specific and actionable
"""

    system_prompt = f"""You are ChatBuddy, a warm and intelligent AI study assistant for school students on the EmpathAI platform.

Student Name: {name}
Grade: {grade} (CBSE Board)
Detected Intent: {intent}
Student Emotional State: {emotional_state}

TONE INSTRUCTION:
{tone_instruction}
{schedule_instruction}

LANGUAGE RULES:
- Detect the language the student is using and respond in the SAME language
- If the student writes in Hindi, respond in Hindi
- If the student writes in English, respond in English
- If the student mixes Hindi and English (Hinglish), respond in Hinglish
- Never force English if the student is not using English
- Never mention that you are GPT or an OpenAI product
- Never say "As an AI language model..."
- Keep responses SHORT and easy to read for school students
- For schedule, progress, and goal questions: use bullet points, not paragraphs
- For curriculum questions: use numbered steps or bullet points where possible
- Maximum 2-3 sentences before switching to a list
- Never write long paragraphs — break everything into short, scannable points

ACADEMIC RULES (for CURRICULUM intent):
- Only explain concepts at {grade} level (CBSE)
- Use simple, age-appropriate language
- For math problems, guide step by step rather than giving the full answer immediately
- Use LaTeX for math: inline $expression$ and block $$expression$$

EMOTIONAL SUPPORT RULES:
- Always acknowledge feelings first
- Be non-judgmental and empathetic
- If crisis signals detected, provide iCall helpline: 9152987821

HIDDEN TAGS — append on the very last line only, no label text, no explanation:
[MODE:curriculum] or [MODE:mental_health] or [MODE:casual]
[FLAG:false] or [FLAG:true][FLAG_REASON:reason][SENTIMENT:label][SEVERITY:medium/high/critical]

Always append both MODE and FLAG tags on the very last line. Never write the words Academic, Emotional, Casual, No distress, or Distress detected."""

    return system_prompt


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


def _strip_all_tags(text: str) -> str:
    text = re.sub(r'\[MODE:[^\]]*\]', '', text)
    text = re.sub(r'\[FLAG:[^\]]*\]', '', text)
    text = re.sub(r'\[FLAG_REASON:[^\]]*\]', '', text)
    text = re.sub(r'\[SENTIMENT:[^\]]*\]', '', text)
    text = re.sub(r'\[SEVERITY:[^\]]*\]', '', text)
    return text.strip()


def response_generator(state: ChatState) -> ChatState:
    if state.get("is_crisis"):
        logger.info("Response generator skipped — crisis already handled")
        return state

    try:
        system_prompt = _build_system_prompt(state)

        messages = [SystemMessage(content=system_prompt)]

        for msg in state.get("history", []):
            role = msg.get("role") if isinstance(msg, dict) else msg.role
            content = msg.get("content") if isinstance(msg, dict) else msg.content
            if role == "user":
                messages.append(HumanMessage(content=content))
            else:
                messages.append(AIMessage(content=content))

        user_content = []
        message_text = state.get("message", "")
        if message_text:
            user_content.append({"type": "text", "text": message_text})

        images = state.get("images", [])
        for img in images:
            url = img if img.startswith("data:") else f"data:image/jpeg;base64,{img}"
            user_content.append({
                "type": "image_url",
                "image_url": {"url": url, "detail": "high"}
            })

        image_base64 = state.get("image_base64")
        image_mime_type = state.get("image_mime_type")
        if image_base64 and image_mime_type:
            user_content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:{image_mime_type};base64,{image_base64}",
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
            model=model_name,
            temperature=0.5,
            api_key=os.getenv("OPENAI_API_KEY"),
            max_tokens=2048,
        )

        response = llm.invoke(messages)
        raw_reply = response.content.strip()

        flag_data = _parse_flags(raw_reply)
        raw_no_flags = _strip_all_tags(raw_reply)
        clean_reply, detected_mode = _parse_mode(raw_no_flags)

        state["reply"] = clean_reply
        state["detected_mode"] = detected_mode
        state["is_flagged"] = flag_data["is_flagged"]
        state["flag_reason"] = flag_data["flag_reason"]
        state["sentiment"] = flag_data["sentiment"]
        state["severity"] = flag_data["severity"]

        logger.info(
            "Response generated | mode=%s | flagged=%s | model=%s",
            detected_mode, flag_data["is_flagged"], model_name
        )

    except Exception as e:
        logger.error("Response generation failed: %s", str(e), exc_info=True)
        state["reply"] = (
            "I'm sorry, I'm having a little trouble right now. "
            "Please try again in a moment!"
        )
        state["detected_mode"] = "curriculum"
        state["is_flagged"] = False

    return state