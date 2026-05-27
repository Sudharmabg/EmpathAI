from typing import TypedDict, List, Optional, Dict, Any


class ChatState(TypedDict):
    # ── Input from Spring Boot ────────────────────────────────────────────────
    student_id: str
    student_name: str
    grade: str
    message: str
    images: List[str]
    image_base64: Optional[str]
    image_mime_type: Optional[str]

    # ── Schedule context ──────────────────────────────────────────────────────
    today_tasks: List[Dict[str, Any]]
    upcoming_exams: List[Dict[str, Any]]
    active_goals: List[Dict[str, Any]]
    preferred_study_time: Optional[str]
    latest_mood_score: Optional[int]
    mood_label: Optional[str]
    tasks_completed_this_week: int
    tasks_total_this_week: int

    # ── Emotional context ─────────────────────────────────────────────────────
    weekly_mood_history: List[Dict[str, Any]]
    assessment_summary: Optional[Dict[str, Any]]

    # ── Intermediate node results ─────────────────────────────────────────────
    intent: Optional[str]
    emotional_state: Optional[str]
    academic_pressure: Optional[str]
    is_crisis: bool
    schedule_context_summary: Optional[str]

    # ── Fast path flag (set by fast_path_classifier) ──────────────────────────
    # True  → simple curriculum question; emotion + crisis LLM calls skipped
    # False → full pipeline runs (emotional, schedule, or ambiguous messages)
    fast_path: bool

    # ── Emotional context summaries ───────────────────────────────────────────
    mood_pattern_summary: Optional[str]
    assessment_context_summary: Optional[str]

    # ── Empathy validation ────────────────────────────────────────────────────
    needs_empathy_prefix: bool
    empathy_prefix: Optional[str]

    # ── Conversation history (managed by LangGraph checkpointer) ─────────────
    chat_history: List[Dict[str, str]]

    # ── Final output ──────────────────────────────────────────────────────────
    reply: str
    detected_mode: str
    is_flagged: bool
    flag_reason: Optional[str]
    sentiment: Optional[str]
    severity: Optional[str]