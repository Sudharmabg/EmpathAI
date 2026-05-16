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
    images: list[str] = []

    # ── Image attachment (optional) ───────────────────────────────────────────
    image_base64: Optional[str] = None      # Raw base64 image data
    image_mime_type: Optional[str] = None   # e.g. "image/png"


class ChatResponse(BaseModel):
    reply: str
    detected_mode: str        # "curriculum" | "mental_health" | "casual"

    # ── Support-Alert fields ───────────────────────────────────────────────────
    is_flagged: bool = False
    flag_reason: Optional[str] = None
    sentiment: Optional[str] = None
    severity: Optional[str] = None