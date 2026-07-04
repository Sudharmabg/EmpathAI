import logging
from graph.state import ChatState

logger = logging.getLogger("schedule_reasoner")

SCHEDULE_INTENTS = {"SCHEDULE_QUERY", "SCHEDULE_ACTION", "PROGRESS_QUERY"}


def schedule_reasoner(state: ChatState) -> ChatState:
    """
    Node 4 — Schedule Reasoner
    Only runs for schedule-related intents.
    Adds scheduling advice to the context summary based on
    emotional state and academic pressure.
    """
    intent = state.get("intent")

    if intent not in SCHEDULE_INTENTS:
        logger.info("Schedule reasoner skipped for intent: %s", intent)
        return state

    emotional_state = state.get("emotional_state", "NEUTRAL")
    academic_pressure = state.get("academic_pressure", "LOW")
    exams = state.get("upcoming_exams", [])
    goals = state.get("active_goals", [])

    # ── Build personalised scheduling advice ──────────────────────────────────
    advice_parts = []

    if emotional_state in ("DISTRESSED", "STRESSED"):
        advice_parts.append(
            "Student seems stressed — suggest shorter study sessions (20-30 min) and wellness breaks"
        )
    elif academic_pressure == "HIGH":
        advice_parts.append(
            "Exam pressure is HIGH — prioritise exam subject revision"
        )
    elif academic_pressure == "MEDIUM":
        advice_parts.append(
            "Upcoming exams soon — balance revision with regular subjects"
        )
    else:
        advice_parts.append(
            "No immediate pressure — suggest balanced study with breaks"
        )

    # Add exam-specific advice
    if exams:
        urgent_exams = [e for e in exams if e.get("urgency") == "URGENT"]
        if urgent_exams:
            subjects = ", ".join(e.get("subjectName", "") for e in urgent_exams)
            advice_parts.append(f"URGENT: Focus on {subjects}")

    # Add goal-specific advice
    if goals:
        goal_subjects = [g.get("subjectTag", "") for g in goals if g.get("subjectTag")]
        if goal_subjects:
            advice_parts.append(
                f"Student has long-term goals for: {', '.join(goal_subjects)} "
                f"(these are goals, NOT today's pending tasks — do not confuse with incomplete tasks)"
            )

    # Explicitly list pending tasks
    today_tasks = state.get("today_tasks", [])
    pending = [
        t.get("title") or t.get("name") or t.get("subject", "Unnamed")
        for t in today_tasks if not t.get("completed", False)
    ]
    if pending:
        advice_parts.append(f"Pending tasks for today: {', '.join(pending)}")

    advice = " | ".join(advice_parts)

    # Append advice to the existing schedule context summary
    existing_summary = state.get("schedule_context_summary", "")
    state["schedule_context_summary"] = f"{existing_summary} | Scheduling advice: {advice}"

    logger.info("Schedule reasoning complete | advice: %s", advice)
    return state