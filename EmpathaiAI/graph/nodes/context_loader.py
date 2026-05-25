import logging
from collections import Counter
from graph.state import ChatState

logger = logging.getLogger("context_loader")


def _build_mood_pattern_summary(weekly_moods: list) -> str:
    """
    Analyzes the past 7 days of mood logs and builds a human-readable summary.
    Detects patterns like 'mostly sad', 'improving', 'stable', etc.
    """
    if not weekly_moods:
        return "No mood entries in the past 7 days."

    mood_counts = Counter(m.get("mood", "").lower() for m in weekly_moods)
    total = len(weekly_moods)
    dominant_mood, dominant_count = mood_counts.most_common(1)[0]

    negative_moods = {"sad", "anxious", "angry"}
    positive_moods = {"happy"}
    negative_count = sum(mood_counts.get(m, 0) for m in negative_moods)
    positive_count = sum(mood_counts.get(m, 0) for m in positive_moods)

    summary_parts = [f"Logged {total} mood{'s' if total > 1 else ''} in past 7 days"]
    summary_parts.append(f"Most common: {dominant_mood} ({dominant_count}/{total})")

    if negative_count >= total * 0.6:
        summary_parts.append("⚠️ Pattern: predominantly negative emotions")
    elif positive_count >= total * 0.6:
        summary_parts.append("✓ Pattern: predominantly positive emotions")
    else:
        summary_parts.append("Pattern: mixed emotions")

    # Check recent trend (last 3 days)
    recent = [m for m in weekly_moods if m.get("daysAgo", 99) <= 2]
    if recent:
        recent_negative = sum(1 for m in recent if m.get("mood", "").lower() in negative_moods)
        if recent_negative >= len(recent) * 0.6:
            summary_parts.append("Recent trend (last 3 days): concerning")

    # Include short notes
    notes = [m.get("note") for m in weekly_moods if m.get("note")]
    if notes:
        short_notes = [n[:60] for n in notes[:2]]
        summary_parts.append(f"Recent notes: {'; '.join(short_notes)}")

    return " | ".join(summary_parts)


def _build_assessment_summary(assessment: dict) -> str:
    """
    Builds a short summary from the latest Feelings Explorer assessment.
    """
    if not assessment:
        return "No assessment completed yet."

    parts = []
    group = assessment.get("groupName", "Assessment")
    days_ago = assessment.get("daysAgo")

    if days_ago is not None:
        if days_ago == 0:
            parts.append(f"{group} taken today")
        elif days_ago == 1:
            parts.append(f"{group} taken yesterday")
        else:
            parts.append(f"{group} taken {days_ago} days ago")
    else:
        parts.append(group)

    summary_text = assessment.get("summaryText", "")
    if summary_text:
        truncated = summary_text[:200] + ("..." if len(summary_text) > 200 else "")
        parts.append(f"Summary: {truncated}")

    bullets = assessment.get("bulletPoints", "")
    if bullets:
        truncated = bullets[:200] + ("..." if len(bullets) > 200 else "")
        parts.append(f"Key points: {truncated}")

    return " | ".join(parts)


def context_loader(state: ChatState) -> ChatState:
    exams = state.get("upcoming_exams", [])
    today_tasks = state.get("today_tasks", [])
    goals = state.get("active_goals", [])
    mood_score = state.get("latest_mood_score")
    weekly_moods = state.get("weekly_mood_history", [])
    assessment = state.get("assessment_summary")
    sleep_hours   = state.get("sleep_hours")
    sleep_quality = state.get("sleep_quality")
    current_mood  = state.get("current_mood")

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

    # ── Overview: sleep last night + current mood ─────────────────────────────
    if sleep_hours is not None:
        quality_str = f" ({sleep_quality})" if sleep_quality else ""
        summary_parts.append(f"Sleep last night: {sleep_hours} hrs{quality_str}")
    if current_mood:
        summary_parts.append(f"Current mood: {current_mood}")

    state["schedule_context_summary"] = (
        " | ".join(summary_parts) if summary_parts else "No schedule data available"
    )

    # ── NEW: Build emotional context summaries ───────────────────────────────
    state["mood_pattern_summary"] = _build_mood_pattern_summary(weekly_moods)
    state["assessment_context_summary"] = _build_assessment_summary(assessment)

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
    state["needs_empathy_prefix"] = False
    state["empathy_prefix"] = None

    logger.info(
        "Context loaded | pressure=%s | mood_pattern=%s | assessment=%s",
        state["academic_pressure"],
        state["mood_pattern_summary"],
        state["assessment_context_summary"][:80] if state.get("assessment_context_summary") else "None"
    )

    return state