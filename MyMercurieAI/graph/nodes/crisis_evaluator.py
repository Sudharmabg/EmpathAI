import logging
import os
import json
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from graph.state import ChatState

load_dotenv()

logger = logging.getLogger("crisis_evaluator")

CRISIS_REPLY = """I'm really sorry to hear that you're feeling this way. Please know that you are not alone, and what you're going through matters deeply.

There are people who care about you and want to help. Please reach out to the **iCall helpline at 9152987821** — they are trained counsellors who are there to listen and support you anytime.

You can also talk to a trusted adult — a parent, teacher, or school counsellor — someone who can be with you right now.

You don't have to face this alone. 💙"""


def _llm_crisis_double_check(message: str, mood_summary: str) -> bool:
    """
    Second layer of safety: even if intent classifier missed it,
    use LLM to detect subtle crisis signals.
    Returns True if crisis detected.
    """
    try:
        llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0,
            api_key=os.getenv("OPENAI_API_KEY"),
            max_tokens=80,
        )

        system_prompt = """You are a safety classifier for a student mental health chatbot.

Detect if the message contains ANY signal of:
- Suicidal thoughts (direct or indirect)
- Self-harm intent
- Wanting to disappear, give up, or "not be here"
- Severe hopelessness or worthlessness
- Talking about death in a personal way

Be cautious — false positives are OK, false negatives are dangerous.

Return ONLY valid JSON:
{
  "is_crisis": true/false,
  "reason": "one short sentence"
}"""

        user_prompt = f"""STUDENT MESSAGE: "{message}"

MOOD CONTEXT: {mood_summary}

Is this a crisis?"""

        from graph.utils.llm_retry import with_retry
        response = with_retry(lambda: llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ]))

        raw = response.content.strip()
        if raw.startswith("```"):
            parts = raw.split("```")
            if len(parts) >= 2:
                raw = parts[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        result = json.loads(raw)
        is_crisis = bool(result.get("is_crisis", False))

        if is_crisis:
            logger.warning("LLM crisis double-check FLAGGED: %s", result.get("reason"))

        return is_crisis
    except Exception as e:
        logger.warning("LLM crisis double-check failed: %s", e)
        return False


def crisis_evaluator(state: ChatState) -> ChatState:
    """
    Node 5 — Crisis Evaluator (ENHANCED with double-check)
    Layer 1: Intent-based crisis detection (from intent_classifier)
    Layer 2: LLM double-check (only runs for DISTRESSED/STRESSED messages)
    """
    intent = state.get("intent", "")
    emotional_state = state.get("emotional_state", "")
    message = state.get("message", "")
    mood_summary = state.get("mood_pattern_summary", "")

    is_crisis = False

    # ── Layer 1: Intent-based crisis check ────────────────────────────────────
    if intent == "CRISIS":
        is_crisis = True
        logger.warning("Crisis detected via INTENT classifier")

    # ── Layer 2: LLM double-check for emotional messages ─────────────────────
    elif emotional_state in ("DISTRESSED", "STRESSED"):
        if _llm_crisis_double_check(message, mood_summary):
            is_crisis = True
            logger.warning("Crisis detected via LLM DOUBLE-CHECK (missed by intent)")

    if is_crisis:
        state["is_crisis"] = True
        state["is_flagged"] = True
        state["flag_reason"] = "Suicidal ideation / Self-harm signals"
        state["sentiment"] = "Highly Concerned"
        state["severity"] = "critical"
        state["detected_mode"] = "mental_health"
        state["emotional_state"] = "DISTRESSED"
        state["reply"] = CRISIS_REPLY

        logger.warning(
            "CRISIS RESPONSE TRIGGERED for student: %s | message: %s",
            state.get("student_name"),
            state.get("message", "")[:100]
        )
    else:
        state["is_crisis"] = False
        logger.info("No crisis detected")

    return state