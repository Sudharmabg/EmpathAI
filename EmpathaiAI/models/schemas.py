from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class HistoryMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    # ── Core input ───────────────────────────────────────────────────────────
    student_name: str
    grade: str
    message: str
    history: List[HistoryMessage] = Field(default_factory=list)
    images: Optional[List[str]] = Field(default_factory=list)
    image_base64: Optional[str] = None
    image_mime_type: Optional[str] = None

    # ── Schedule context ─────────────────────────────────────────────────────
    today_tasks: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    upcoming_exams: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    active_goals: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    preferred_study_time: Optional[str] = None
    tasks_completed_this_week: Optional[int] = 0
    tasks_total_this_week: Optional[int] = 0

    # ── Mood context ─────────────────────────────────────────────────────────
    latest_mood_score: Optional[int] = None
    mood_label: Optional[str] = None

    # ── NEW: Emotional context for LangGraph emotional support ──────────────
    weekly_mood_history: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    assessment_summary: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    reply: str
    detected_mode: str
    is_flagged: bool = False
    flag_reason: Optional[str] = None
    sentiment: Optional[str] = None
    severity: Optional[str] = None