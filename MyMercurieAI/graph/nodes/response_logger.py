import logging
from graph.state import ChatState

logger = logging.getLogger("response_logger")


def response_logger(state: ChatState) -> ChatState:
    """
    Node 7 — Response Logger
    Logs the full interaction details for monitoring and debugging.
    """
    logger.info(
        "ChatBuddy interaction complete | "
        "student=%s | grade=%s | "
        "intent=%s | emotional_state=%s | "
        "academic_pressure=%s | is_flagged=%s | "
        "mode=%s | severity=%s",
        state.get("student_name"),
        state.get("grade"),
        state.get("intent"),
        state.get("emotional_state"),
        state.get("academic_pressure"),
        state.get("is_flagged"),
        state.get("detected_mode"),
        state.get("severity"),
    )
    return state