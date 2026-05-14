from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class ChatMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    student_name: str
    grade: str
    message: str
    history: List[ChatMessage] = []
    images: List[str] = []

    # ── Image attachment (optional) ───────────────────────────────────────────
    image_base64: Optional[str] = None
    image_mime_type: Optional[str] = None

    # ── NEW: Schedule context from Spring Boot ────────────────────────────────
    today_tasks: List[Dict[str, Any]] = []
    upcoming_exams: List[Dict[str, Any]] = []
    active_goals: List[Dict[str, Any]] = []
    preferred_study_time: Optional[str] = None   # MORNING | AFTERNOON | EVENING | NIGHT
    latest_mood_score: Optional[int] = None
    mood_label: Optional[str] = None
    tasks_completed_this_week: int = 0
    tasks_total_this_week: int = 0


class ChatResponse(BaseModel):
    reply: str
    detected_mode: str        # "curriculum" | "mental_health" | "casual"

    # ── Support-Alert fields ──────────────────────────────────────────────────
    is_flagged: bool = False
    flag_reason: Optional[str] = None
    sentiment: Optional[str] = None
    severity: Optional[str] = None