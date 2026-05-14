import logging
from graph.state import ChatState

logger = logging.getLogger("emotion_evaluator")


def emotion_evaluator(state: ChatState) -> ChatState:
    """
    Node 3 — Emotional State Evaluator
    Combines intent and mood score to determine the student's emotional state.
    States: POSITIVE | NEUTRAL | STRESSED | DISTRESSED
    """
    intent = state.get("intent", "CURRICULUM")
    mood_score = state.get("latest_mood_score")

    if intent == "CRISIS":
        state["emotional_state"] = "DISTRESSED"
        logger.info("Emotional state: DISTRESSED (crisis intent)")
        return state

    if intent == "EMOTIONAL_SUPPORT":
        if mood_score is not None and mood_score <= 2:
            state["emotional_state"] = "DISTRESSED"
        else:
            state["emotional_state"] = "STRESSED"
        logger.info("Emotional state: %s (emotional support intent)", state["emotional_state"])
        return state

    if mood_score is not None:
        if mood_score >= 4:
            state["emotional_state"] = "POSITIVE"
        elif mood_score == 3:
            state["emotional_state"] = "NEUTRAL"
        elif mood_score == 2:
            state["emotional_state"] = "STRESSED"
        else:
            state["emotional_state"] = "DISTRESSED"
    else:
        state["emotional_state"] = "NEUTRAL"

    logger.info(
        "Emotional state: %s (mood_score=%s)",
        state["emotional_state"],
        mood_score
    )
    return state