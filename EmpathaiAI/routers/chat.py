import logging
from fastapi import APIRouter, HTTPException
from models.schemas import ChatRequest, ChatResponse
from graph.pipeline import pipeline
from graph.state import ChatState
from services.cache_service import get_cached, add_to_cache

router = APIRouter()
logger = logging.getLogger("chat_router")


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Receive a student's message along with context,
    run through the LangGraph pipeline with SQLite memory,
    and return the AI reply.
    LangGraph automatically loads and saves conversation history
    using thread_id = "student-{student_id}".
    """
    logger.info(
        "Received chat request from student: %s (id=%s)",
        request.student_name,
        request.student_id
    )

    try:
        # ── Cache check for simple curriculum questions ────────────────────────
        has_images = bool(request.images) or bool(request.image_base64)
        if not has_images:
            cached = get_cached(request.message)
            if cached:
                logger.info("Cache hit for: %s", request.student_name)
                return ChatResponse(
                    reply=cached["answer"],
                    detected_mode=cached["mode"],
                    is_flagged=False,
                )

        # ── Build initial state for LangGraph ─────────────────────────────────
        # NOTE: No history passed manually — LangGraph loads it automatically
        # from checkpoints.db using the thread_id below.
        initial_state: ChatState = {
            # ── Core input ─────────────────────────────────────────────────────
            "student_id":        request.student_id,
            "student_name":      request.student_name,
            "grade":             request.grade,
            "message":           request.message,
            "images":            request.images or [],
            "image_base64":      request.image_base64,
            "image_mime_type":   request.image_mime_type,

            # ── Schedule context ───────────────────────────────────────────────
            "today_tasks":               request.today_tasks or [],
            "upcoming_exams":            request.upcoming_exams or [],
            "active_goals":              request.active_goals or [],
            "preferred_study_time":      request.preferred_study_time,
            "latest_mood_score":         request.latest_mood_score,
            "mood_label":                request.mood_label,
            "tasks_completed_this_week": request.tasks_completed_this_week or 0,
            "tasks_total_this_week":     request.tasks_total_this_week or 0,

            # ── Emotional context ──────────────────────────────────────────────
            "weekly_mood_history": request.weekly_mood_history or [],
            "assessment_summary":  request.assessment_summary,

            # ── Intermediate fields — reset each turn ──────────────────────────
            "intent":                     None,
            "emotional_state":            None,
            "academic_pressure":          None,
            "is_crisis":                  False,
            "schedule_context_summary":   None,
            "mood_pattern_summary":       None,
            "assessment_context_summary": None,
            "needs_empathy_prefix":       False,
            "empathy_prefix":             None,

            # ── Conversation history — LangGraph manages this ──────────────────
            # Start empty each turn; checkpointer merges with saved state
            "chat_history": [],

            # ── Output fields — reset each turn ───────────────────────────────
            "reply":        "",
            "detected_mode":"curriculum",
            "is_flagged":   False,
            "flag_reason":  None,
            "sentiment":    None,
            "severity":     None,
        }

        # ✅ thread_id = student_id so each student has their own memory
        thread_config = {
            "configurable": {
                "thread_id": f"student-{request.student_id}"
            }
        }

        # ── Run LangGraph pipeline with persistent memory ──────────────────────
        result = pipeline.invoke(initial_state, config=thread_config)

        # ── Cache simple curriculum responses ──────────────────────────────────
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
            reply=        result["reply"],
            detected_mode=result["detected_mode"],
            is_flagged=   result.get("is_flagged", False),
            flag_reason=  result.get("flag_reason"),
            sentiment=    result.get("sentiment"),
            severity=     result.get("severity"),
        )

    except Exception as e:
        logger.error(
            "Error in chat endpoint for %s: %s",
            request.student_name, str(e), exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail=f"AI service error: {str(e)}"
        )