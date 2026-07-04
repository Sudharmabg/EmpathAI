"""
routers/curriculum_ai.py
─────────────────────────
POST /api/ai/process — Unified AI task router for all student tools.
Receives task + context from Spring Boot (which has already checked its cache).
Runs the RAG orchestrator and returns validated JSON.
"""

import logging
import os
from fastapi import APIRouter, HTTPException, Depends, Header, status
from pydantic import BaseModel
from typing import Optional

INTERNAL_TOKEN = os.getenv("INTERNAL_API_KEY", "mymercurie-internal-key-2026")

async def verify_internal_token(x_internal_token: str = Header(None)):
    if x_internal_token != INTERNAL_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing internal service token"
        )

router = APIRouter(
    prefix="/api/ai",
    dependencies=[Depends(verify_internal_token)]
)
logger = logging.getLogger("curriculum_ai_router")

SUPPORTED_TASKS = {"FLASHCARDS", "SUMMARY", "MNEMONIC", "MOCK_TEST", "ANALOGY"}


class AiProcessRequest(BaseModel):
    task: str                 # FLASHCARDS | SUMMARY | MNEMONIC | MOCK_TEST
    chapter_id: int
    topic: Optional[str] = None   # None for chapter-level (SUMMARY)
    grade: str
    subject: str
    chapter: str
    student_id: Optional[str] = None


class AiProcessResponse(BaseModel):
    task: str
    chapter_id: int
    topic: Optional[str]
    content: dict             # Validated JSON matching the task schema


@router.post("/process", response_model=AiProcessResponse)
async def process_ai_task(request: AiProcessRequest):
    """
    Run the RAG orchestrator for the requested task.
    Spring Boot has already checked MySQL cache — this always generates fresh.
    """
    task = request.task.upper()

    if task not in SUPPORTED_TASKS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported task: {task}. Supported: {SUPPORTED_TASKS}"
        )

    logger.info(
        "AI process: task=%s chapter_id=%d topic=%s student=%s",
        task, request.chapter_id, request.topic, request.student_id
    )

    try:
        from curriculum.rag_orchestrator import process
        result = process(
            task=task,
            chapter_id=request.chapter_id,
            topic=request.topic,
            grade=request.grade,
            subject=request.subject,
            chapter=request.chapter,
        )
        return AiProcessResponse(
            task=task,
            chapter_id=request.chapter_id,
            topic=request.topic,
            content=result,
        )

    except RuntimeError as e:
        logger.error("AI process failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error("Unexpected error in AI process: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="AI processing failed")
