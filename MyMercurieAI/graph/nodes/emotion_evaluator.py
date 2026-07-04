import logging
import os
import json
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from graph.state import ChatState

load_dotenv()

logger = logging.getLogger("emotion_evaluator")


def _llm_emotion_check(message: str, mood_summary: str, assessment_summary: str) -> dict:
    """
    Uses GPT-4o-mini to analyze the message text along with mood history
    and assessment baseline to determine the true emotional state.
    """
    try:
        llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0,
            api_key=os.getenv("OPENAI_API_KEY"),
            max_tokens=200,
        )

        system_prompt = """You are an emotion analysis assistant for a student wellness chatbot.

Analyze the student's CURRENT message along with their mood history and assessment baseline.

Classify the emotional state as ONE of:
- POSITIVE: happy, content, excited
- NEUTRAL: calm, okay, no strong emotion
- STRESSED: worried, overwhelmed, frustrated, mild anxiety
- DISTRESSED: very sad, hopeless, severe anxiety, panic, deep emotional pain

Return ONLY valid JSON in this exact format:
{
  "emotional_state": "POSITIVE|NEUTRAL|STRESSED|DISTRESSED",
  "confidence": 0.0-1.0,
  "primary_emotion": "single word like sad/anxious/happy/calm/etc",
  "reasoning": "one short sentence"
}"""

        user_prompt = f"""STUDENT MESSAGE: "{message}"

MOOD HISTORY (last 7 days): {mood_summary}

MENTAL HEALTH BASELINE: {assessment_summary}

Analyze the emotional state."""

        from graph.utils.llm_retry import with_retry
        response = with_retry(lambda: llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ]))

        raw = response.content.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            parts = raw.split("```")
            if len(parts) >= 2:
                raw = parts[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        return json.loads(raw)
    except Exception as e:
        logger.warning("LLM emotion check failed: %s", e)
        return None


def _rule_based_fallback(intent: str, mood_score) -> str:
    """Fallback to original rule-based logic if LLM fails."""
    if intent == "CRISIS":
        return "DISTRESSED"
    if intent == "EMOTIONAL_SUPPORT":
        return "DISTRESSED" if mood_score is not None and mood_score <= 2 else "STRESSED"
    if mood_score is not None:
        if mood_score >= 4:
            return "POSITIVE"
        if mood_score == 3:
            return "NEUTRAL"
        if mood_score == 2:
            return "STRESSED"
        return "DISTRESSED"
    return "NEUTRAL"


def emotion_evaluator(state: ChatState) -> ChatState:
    """
    Node 3 — Emotional State Evaluator (ENHANCED)
    Uses LLM to read the actual message text combined with:
    - Past 7 days of mood logs
    - Latest Feelings Explorer assessment
    Falls back to rule-based if LLM fails.
    """
    intent = state.get("intent", "CURRICULUM")
    mood_score = state.get("latest_mood_score")
    message = state.get("message", "")
    mood_summary = state.get("mood_pattern_summary", "No mood data")
    assessment_summary = state.get("assessment_context_summary", "No assessment data")

    # If clearly a short curriculum question, skip LLM call for speed
    if intent == "CURRICULUM" and len(message.split()) < 20:
        state["emotional_state"] = _rule_based_fallback(intent, mood_score)
        logger.info("Emotion: %s (rule-based, short curriculum)", state["emotional_state"])
        return state

    # Use LLM for accurate emotion analysis
    result = _llm_emotion_check(message, mood_summary, assessment_summary)

    if result and "emotional_state" in result:
        state["emotional_state"] = result["emotional_state"]
        logger.info(
            "Emotion: %s | primary=%s | confidence=%.2f | reason=%s",
            result["emotional_state"],
            result.get("primary_emotion"),
            result.get("confidence", 0),
            result.get("reasoning", "")
        )
    else:
        state["emotional_state"] = _rule_based_fallback(intent, mood_score)
        logger.info("Emotion: %s (rule-based fallback)", state["emotional_state"])

    return state