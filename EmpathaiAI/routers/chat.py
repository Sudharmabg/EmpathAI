"""
routers/chat.py  —  Chat endpoints (non-streaming + streaming)
───────────────────────────────────────────────────────────────
  • POST /chat        — runs pipeline.invoke() in a ThreadPoolExecutor
                        so it never blocks the FastAPI event loop.
  • POST /chat/stream — NEW endpoint using Server-Sent Events.
                        The browser receives the first token in ~300 ms
                        instead of waiting 3–6 s for the full response.
                        Falls back to cache / casual path before hitting OpenAI.
"""

from __future__ import annotations
from openai import OpenAI
import os
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from graph.pipeline import pipeline
from graph.state import ChatState
from models.schemas import ChatRequest, ChatResponse
from services.cache_service import add_to_cache, get_cached
from services.openai_service import stream_chat_response

router = APIRouter()
logger = logging.getLogger("chat_router")

# Thread pool for running the blocking LangGraph pipeline without stalling
# the async event loop.
_pipeline_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="langgraph")
_openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_initial_state(request: ChatRequest) -> ChatState:
    return {
        # ── Core input ────────────────────────────────────────────────────────
        "student_id":        request.student_id,
        "student_name":      request.student_name,
        "grade":             request.grade,
        "message":           request.message,
        "images":            request.images or [],
        "image_base64":      request.image_base64,
        "image_mime_type":   request.image_mime_type,

        # ── Schedule context ──────────────────────────────────────────────────
        "today_tasks":               request.today_tasks or [],
        "upcoming_exams":            request.upcoming_exams or [],
        "active_goals":              request.active_goals or [],
        "preferred_study_time":      request.preferred_study_time,
        "latest_mood_score":         request.latest_mood_score,
        "mood_label":                request.mood_label,
        "tasks_completed_this_week": request.tasks_completed_this_week or 0,
        "tasks_total_this_week":     request.tasks_total_this_week or 0,

        # ── Overview context ──────────────────────────────────────────────────
        "sleep_hours":   request.sleep_hours,
        "sleep_quality": request.sleep_quality,
        "current_mood":  request.current_mood,

        # ── Emotional context ─────────────────────────────────────────────────
        "weekly_mood_history": request.weekly_mood_history or [],
        "assessment_summary":  request.assessment_summary,

        # ── Intermediate fields — reset each turn ─────────────────────────────
        "intent":                     None,
        "emotional_state":            None,
        "academic_pressure":          None,
        "is_crisis":                  False,
        "schedule_context_summary":   None,
        "mood_pattern_summary":       None,
        "assessment_context_summary": None,
        "needs_empathy_prefix":       False,
        "empathy_prefix":             None,

        # ── Fast path flag (set by fast_path_classifier node) ─────────────────
        "fast_path": False,

        # ✅ chat_history is intentionally NOT passed here
        # LangGraph PostgresSaver automatically loads saved chat_history
        # from the checkpoint using thread_id = "student-{id}"
        # Passing an empty list would overwrite the saved history

        # ── Output fields — reset each turn ───────────────────────────────────
        "reply":         "",
        "detected_mode": "curriculum",
        "is_flagged":    False,
        "flag_reason":   None,
        "sentiment":     None,
        "severity":      None,
    }


def _run_pipeline(initial_state: ChatState, thread_config: dict) -> dict:
    """Blocking wrapper — runs inside ThreadPoolExecutor."""
    return pipeline.invoke(initial_state, config=thread_config)


# ── POST /chat  ───────────────────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Non-streaming endpoint. The LangGraph pipeline is offloaded to a
    thread pool so the async event loop stays unblocked.
    LangGraph automatically loads and saves conversation history
    using thread_id = "student-{student_id}".
    """
    logger.info(
        "Received chat request from student: %s (id=%s)",
        request.student_name,
        request.student_id,
    )

    try:
        # ── Fast path: cache (skip if images attached) ────────────────────────
        has_images = bool(request.images) or bool(request.image_base64)
        if not has_images:
            cached = get_cached(request.message)
            if cached:
                logger.info("Cache hit for %s", request.student_name)
                return ChatResponse(
                    reply=cached["answer"],
                    detected_mode=cached["mode"],
                    is_flagged=False,
                )

        # ── Run LangGraph pipeline in thread pool (non-blocking) ──────────────
        initial_state = _build_initial_state(request)
        thread_config = {
            "configurable": {
                "thread_id": f"student-{request.student_id}"
            }
        }

        loop   = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            _pipeline_executor,
            _run_pipeline,
            initial_state,
            thread_config,
        )

        # ── Cache simple curriculum responses ─────────────────────────────────
        if (
            result.get("detected_mode") == "curriculum"
            and not has_images
            and not result.get("is_flagged")
        ):
            add_to_cache(
                request.message,
                result["reply"],
                result["detected_mode"]
            )

        logger.info(
            "Response completed for %s | mode=%s | flagged=%s",
            request.student_name,
            result.get("detected_mode"),
            result.get("is_flagged"),
        )

        return ChatResponse(
            reply=         result["reply"],
            detected_mode= result["detected_mode"],
            is_flagged=    result.get("is_flagged", False),
            flag_reason=   result.get("flag_reason"),
            sentiment=     result.get("sentiment"),
            severity=      result.get("severity"),
        )

    except Exception as exc:
        logger.error(
            "Error in /chat for %s: %s",
            request.student_name, str(exc), exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail=f"AI service error: {str(exc)}"
        )


# ── POST /chat/stream  (Server-Sent Events) ───────────────────────────────────

@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    Streaming endpoint using Server-Sent Events.

    The client receives tokens as they are generated by OpenAI, so the
    perceived latency drops to ~300 ms for the first visible word.

    SSE frame format
    ────────────────
    Normal token chunk:   data: <text>\n\n
    Metadata (end):       data: [META]{...json...}\n\n
    End signal:           data: [DONE]\n\n
    """
    logger.info(
        "Stream request from %s (id=%s)",
        request.student_name,
        request.student_id,
    )

    return StreamingResponse(
        stream_chat_response(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control":     "no-cache",
            "X-Accel-Buffering": "no",
            "Transfer-Encoding": "chunked",
        },
    )
@router.post("/agent")
async def agent_chat(body: dict):
    """
    Forwards OpenAI-format requests (with tools) directly to OpenAI.
    Used by the Schedule Assistant for function calling.
    """
    try:
        response = _openai_client.chat.completions.create(**body)
        return response.model_dump()
    except Exception as exc:
        logger.error("Error in /agent: %s", str(exc), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Agent error: {str(exc)}")