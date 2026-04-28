from pydantic import BaseModel
from typing import Optional


class ChatMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    student_name: str
    grade: str
    message: str
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str
    detected_mode: str                      # "curriculum" | "mental_health"

    # ── Support-Alert fields (None when not flagged) ──────────────────────────
    is_flagged: bool = False                # True when AI detects a concerning message
    flag_reason: Optional[str] = None      # e.g. "Suicidal ideation / Self-harm"
    sentiment: Optional[str] = None        # e.g. "Highly Concerned", "Distressed"
    severity: Optional[str] = None         # "critical" | "high" | "medium"