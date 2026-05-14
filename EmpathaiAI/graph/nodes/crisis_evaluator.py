import logging
from graph.state import ChatState

logger = logging.getLogger("crisis_evaluator")

CRISIS_REPLY = """I'm really sorry to hear that you're feeling this way. Please know that you are not alone, and what you're going through matters deeply.

There are people who care about you and want to help. Please reach out to the **iCall helpline at 9152987821** — they are trained counsellors who are there to listen and support you anytime.

You can also talk to a trusted adult — a parent, teacher, or school counsellor — someone who can be with you right now.

You don't have to face this alone. 💙"""


def crisis_evaluator(state: ChatState) -> ChatState:
    """
    Node 5 — Crisis Evaluator
    Checks for crisis signals via intent (already classified by Node 2).
    If crisis detected:
    - Sets predefined empathetic response
    - Flags as CRITICAL
    - Skips Node 6 (response generator)
    """
    intent = state.get("intent", "")

    if intent == "CRISIS":
        state["is_crisis"] = True
        state["is_flagged"] = True
        state["flag_reason"] = "Suicidal ideation / Self-harm"
        state["sentiment"] = "Highly Concerned"
        state["severity"] = "critical"
        state["detected_mode"] = "mental_health"
        state["emotional_state"] = "DISTRESSED"
        state["reply"] = CRISIS_REPLY

        logger.warning(
            "CRISIS DETECTED for student: %s | message: %s",
            state.get("student_name"),
            state.get("message", "")[:100]
        )
    else:
        state["is_crisis"] = False
        logger.info("No crisis detected")

    return state