import logging
from graph.state import ChatState

logger = logging.getLogger("context_loader")


def context_loader(state: ChatState) -> ChatState:
    exams = state.get("upcoming_exams", [])  # ← FIXED (was reading today_tasks)
    today_tasks = state.get("today_tasks", [])
    goals = state.get("active_goals", [])
    mood_score = state.get("latest_mood_score")

    # ── Calculate academic pressure ───────────────────────────────────────────
    if any(e.get("daysRemaining", 99) <= 7 for e in exams):
        state["academic_pressure"] = "HIGH"
    elif any(e.get("daysRemaining", 99) <= 14 for e in exams):
        state["academic_pressure"] = "MEDIUM"
    else:
        state["academic_pressure"] = "LOW"

    # ── Build schedule context summary ────────────────────────────────────────
    summary_parts = []

    if today_tasks:
        completed = sum(1 for t in today_tasks if t.get("completed", False))
        summary_parts.append(
            f"Today: {len(today_tasks)} tasks planned, {completed} completed"
        )

        # ── List each task with its completion status ─────────────────────────
        task_lines = []
        for t in today_tasks:
            name = t.get("title") or t.get("name") or t.get("subject") or "Unnamed task"
            status = "✅ Done" if t.get("completed", False) else "⬜ Pending"
            task_lines.append(f"  - {name}: {status}")
        summary_parts.append("Task details:\n" + "\n".join(task_lines))

    if exams:
        nearest = exams[0]
        subject = nearest.get("subjectName", "Unknown")
        days = nearest.get("daysRemaining", "?")
        urgency = nearest.get("urgency", "NORMAL")
        summary_parts.append(
            f"Nearest exam: {subject} in {days} days ({urgency})"
        )

    if goals:
        summary_parts.append(f"Active goals: {len(goals)}")

    completed_week = state.get("tasks_completed_this_week", 0)
    total_week = state.get("tasks_total_this_week", 0)
    if total_week > 0:
        summary_parts.append(
            f"Week progress: {completed_week}/{total_week} tasks completed"
        )

    preferred = state.get("preferred_study_time")
    if preferred:
        summary_parts.append(f"Preferred study time: {preferred}")

    if mood_score is not None:
        summary_parts.append(f"Latest mood score: {mood_score}/5")

    state["schedule_context_summary"] = (
        " | ".join(summary_parts) if summary_parts else "No schedule data available"
    )

    # ── Initialise defaults ───────────────────────────────────────────────────
    state["is_crisis"] = False
    state["is_flagged"] = False
    state["intent"] = None
    state["emotional_state"] = None
    state["reply"] = ""
    state["detected_mode"] = "curriculum"
    state["flag_reason"] = None
    state["sentiment"] = None
    state["severity"] = None

    logger.info(
        "Context loaded | pressure=%s | summary=%s",
        state["academic_pressure"],
        state["schedule_context_summary"]
    )

    return state