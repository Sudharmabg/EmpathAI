from pydantic import BaseModel
from typing import List, Optional


class HistoryMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    student_name: str
    grade: str
    message: str
    history: Optional[List[HistoryMessage]] = []


class ChatResponse(BaseModel):
    reply: str
    detected_mode: str  # "curriculum" or "mental_health"
