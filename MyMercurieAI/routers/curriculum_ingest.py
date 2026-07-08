"""
routers/curriculum_ingest.py
─────────────────────────────
POST /api/curriculum/ingest  — Receive raw chapter from Spring Boot and run pipeline
GET  /api/curriculum/status/{chapter_id} — Return current processing status

The pipeline runs in a background thread so this endpoint returns immediately
with status=PROCESSING. Spring Boot polls /status until PROCESSED or FAILED.
"""

import logging
import os
import threading
from fastapi import APIRouter, HTTPException, Depends, Header, status
from pydantic import BaseModel, Field
from typing import Optional

INTERNAL_TOKEN = os.getenv("INTERNAL_API_KEY", "mymercurie-internal-key-2026")

async def verify_internal_token(x_internal_token: str = Header(None)):
    if x_internal_token != INTERNAL_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing internal service token"
        )

router = APIRouter(
    prefix="/api/curriculum",
    dependencies=[Depends(verify_internal_token)]
)
logger = logging.getLogger("curriculum_ingest_router")

# ── In-memory status store ────────────────────────────────────────────────────
# In production, this would be a Redis key or DB field.
# Here we use a simple dict since Spring Boot is the source of truth for status.
_status_store: dict[int, dict] = {}   # chapter_id → {"status": str, "metadata": dict|None}
_store_lock = threading.Lock()


class IngestRequest(BaseModel):
    chapter_id: int
    board: str = "CBSE"
    grade: str
    subject: str
    chapter_title: str
    chapter_number: Optional[int] = None
    subtopics: Optional[str] = None # JSON string if provided
    raw_content: str = Field(..., min_length=100)
    image_bank: Optional[str] = None  # JSON string: [{conceptName, imageUrl}]


class IngestResponse(BaseModel):
    chapter_id: int
    status: str
    message: str


class StatusResponse(BaseModel):
    chapter_id: int
    status: str           # PENDING | PROCESSING | PROCESSED | FAILED
    metadata: Optional[dict] = None


def _on_status_update(chapter_id: int, new_status: str, metadata: Optional[dict]):
    """Callback called by pipeline at each stage. Updates in-memory store."""
    with _store_lock:
        _status_store[chapter_id] = {"status": new_status, "metadata": metadata}
    logger.info("chapter_id=%d status → %s", chapter_id, new_status)


@router.post("/ingest", response_model=IngestResponse)
async def ingest_chapter(request: IngestRequest):
    """
    Receive raw chapter content from Spring Boot.
    Starts the pipeline in a background thread.
    Returns immediately with status=PROCESSING.
    """
    logger.info(
        "Ingest request: chapter_id=%d '%s' grade=%s",
        request.chapter_id, request.chapter_title, request.grade
    )

    with _store_lock:
        _status_store[request.chapter_id] = {"status": "PROCESSING", "metadata": None}

    # Run pipeline in a daemon thread (non-blocking)
    thread = threading.Thread(
        target=_run_pipeline_thread,
        args=(
            request.chapter_id,
            request.raw_content,
            request.grade,
            request.subject,
            request.chapter_title,
            request.board,
            request.chapter_number,
            request.subtopics,
            request.image_bank,
        ),
        daemon=True
    )
    thread.start()

    return IngestResponse(
        chapter_id=request.chapter_id,
        status="PROCESSING",
        message="Chapter ingestion pipeline started"
    )


def _run_pipeline_thread(chapter_id, raw_content, grade, subject, chapter_title, board, chapter_number, subtopics, image_bank=None):
    """Wrapper to run pipeline.run_pipeline in a thread."""
    try:
        from curriculum.pipeline import run_pipeline
        
        # Parse manual subtopics if provided
        manual_subtopics = None
        if subtopics:
            import json
            try:
                manual_subtopics = json.loads(subtopics)
            except Exception as e:
                logger.warning(f"Failed to parse manual subtopics JSON: {e}")

        # Parse image bank if provided
        parsed_image_bank = None
        if image_bank:
            import json
            try:
                parsed_image_bank = json.loads(image_bank)
            except Exception as e:
                logger.warning(f"Failed to parse image_bank JSON: {e}")

        run_pipeline(
            chapter_id=chapter_id,
            raw_text=raw_content,
            grade=grade,
            subject=subject,
            chapter_title=chapter_title,
            board=board,
            chapter_number=chapter_number,
            manual_subtopics=manual_subtopics,
            image_bank=parsed_image_bank,
            on_status_update=_on_status_update,
        )
    except Exception as e:
        logger.error("Pipeline thread error for chapter_id=%d: %s", chapter_id, e)
        _on_status_update(chapter_id, "FAILED", None)


@router.get("/status/{chapter_id}", response_model=StatusResponse)
async def get_status(chapter_id: int):
    """Return current processing status for a chapter."""
    with _store_lock:
        entry = _status_store.get(chapter_id)

    if not entry:
        return StatusResponse(chapter_id=chapter_id, status="PENDING")

    return StatusResponse(
        chapter_id=chapter_id,
        status=entry["status"],
        metadata=entry.get("metadata")
    )

@router.delete("/embeddings/{chapter_id}")
async def delete_embeddings(chapter_id: int):
    """Delete all embeddings for a chapter."""
    try:
        from curriculum.vector_store import delete_by_chapter
        delete_by_chapter(chapter_id)
        return {"status": "success", "message": f"Deleted embeddings for chapter {chapter_id}"}
    except Exception as e:
        logger.error("Error deleting embeddings for chapter_id=%d: %s", chapter_id, e)
        raise HTTPException(status_code=500, detail="Failed to delete embeddings")
