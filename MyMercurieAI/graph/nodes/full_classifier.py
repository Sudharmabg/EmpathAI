import os
import logging
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from graph.state import ChatState
from graph.utils.llm_retry import with_retry

load_dotenv()
logger = logging.getLogger("full_classifier")

SYSTEM_PROMPT = (
    "You are a classification assistant for a student wellness chatbot.\n\n"
    "Given the student's message, recent mood history, and mental-health baseline, "
    "classify the message into EXACTLY ONE intent and EXACTLY ONE emotional state, and "
    "determine if it is a crisis.\n\n"
    "VALID INTENTS (choose EXACTLY ONE):\n"
    "- SCHEDULE_QUERY: asking what to study, about tasks, schedule, or exams\n"
    "- SCHEDULE_ACTION: wants to add, change, or plan a specific task\n"
    "- EMOTIONAL_SUPPORT: expressing stress, sadness, anxiety, or personal problems\n"
    "- GENERAL_CHAT: casual conversation, greetings, small talk, compliments, thank you\n"
    "- PROGRESS_QUERY: asking about weekly progress or performance\n"
    "- CRISIS: self-harm, suicidal thoughts, wanting to die, severe distress\n"
    "- CURRICULUM: school subject help, homework, concept explanation, math\n\n"
    "VALID EMOTIONAL STATES (choose EXACTLY ONE):\n"
    "- POSITIVE: happy, content, excited, proud, grateful\n"
    "- NEUTRAL: calm, okay, no strong emotion, academic curiosity\n"
    "- STRESSED: worried, overwhelmed, frustrated, mild anxiety, nervous\n"
    "- DISTRESSED: very sad, hopeless, severe anxiety, panic, deep emotional pain\n\n"
    "CRISIS FLAG (is_crisis: true/false):\n"
    "- Set is_crisis to true if the student expresses suicidal thoughts, self-harm, or severe crisis.\n"
    "  Be cautious — false positives are OK, false negatives are dangerous.\n\n"
    "Return a JSON object with EXACTLY these fields: 'intent', 'emotional_state', 'is_crisis'."
)

def full_classifier(state: ChatState) -> ChatState:
    message = state.get("message", "")
    intent = state.get("intent", "CURRICULUM")
    mood_summary = state.get("mood_pattern_summary", "")
    assessment_summary = state.get("assessment_context_summary", "")

    # Fast‑path shortcut for short curriculum queries
    if intent == "CURRICULUM" and len(message.split()) < 20:
        # reuse existing rule‑based fallback for emotion
        from graph.nodes.emotion_evaluator import _rule_based_fallback
        state["emotional_state"] = _rule_based_fallback(intent, state.get("latest_mood_score"))
        state["is_crisis"] = False
        logger.info("Full classifier: fast‑path shortcut used")
        return state

    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0,
        api_key=os.getenv("OPENAI_API_KEY"),
        max_tokens=300,
    )

    user_prompt = (
        f"""STUDENT MESSAGE: \"{message}\"\n\n"
        f"MOOD HISTORY (last 7 days): {mood_summary}\n\n"
        f"MENTAL HEALTH BASELINE: {assessment_summary}\n\n"
        "Classify intent, emotional state, and crisis flag. Return ONLY valid JSON."""
    )

    def call():
        return llm.invoke([SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=user_prompt)])

    response = with_retry(call)
    try:
        raw = response.content.strip()
        if raw.startswith("```"):
            parts = raw.split("```")
            if len(parts) >= 2:
                raw = parts[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()
        # Use json loads safely
        import json
        result = json.loads(raw)
        
        VALID_INTENTS = {
            "SCHEDULE_QUERY", "SCHEDULE_ACTION", "EMOTIONAL_SUPPORT",
            "GENERAL_CHAT", "PROGRESS_QUERY", "CRISIS", "CURRICULUM"
        }
        VALID_EMOTIONS = {"POSITIVE", "NEUTRAL", "STRESSED", "DISTRESSED"}
        
        intent = str(result.get("intent", "CURRICULUM")).strip().upper()
        emotional_state = str(result.get("emotional_state", "NEUTRAL")).strip().upper()
        
        state["intent"] = intent if intent in VALID_INTENTS else "CURRICULUM"
        state["emotional_state"] = emotional_state if emotional_state in VALID_EMOTIONS else "NEUTRAL"
        state["is_crisis"] = bool(result.get("is_crisis", False)) or (state["intent"] == "CRISIS")
        logger.info(
            "Full classifier result – intent=%s, emotion=%s, crisis=%s",
            state["intent"], state["emotional_state"], state["is_crisis"],
        )
    except Exception as e:
        logger.error("Full classifier failed: %s", e)
        # fallback to original separate nodes
        from graph.nodes.intent_classifier import intent_classifier
        from graph.nodes.emotion_evaluator import _rule_based_fallback
        state = intent_classifier(state)
        state["emotional_state"] = _rule_based_fallback(state.get("intent"), state.get("latest_mood_score"))
        state["is_crisis"] = (state.get("intent") == "CRISIS")

    # If crisis is detected, populate all required safety/metadata fields
    if state.get("is_crisis"):
        from graph.nodes.crisis_evaluator import CRISIS_REPLY
        state["is_flagged"] = True
        state["flag_reason"] = "Suicidal ideation / Self-harm signals"
        state["sentiment"] = "Highly Concerned"
        state["severity"] = "critical"
        state["detected_mode"] = "mental_health"
        state["emotional_state"] = "DISTRESSED"
        state["reply"] = CRISIS_REPLY
        logger.warning("Crisis response fields populated in full classifier")

    return state
