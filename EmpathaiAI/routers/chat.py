import logging
from fastapi import APIRouter, HTTPException
from models.schemas import ChatRequest, ChatResponse
from graph.pipeline import pipeline
from graph.state import ChatState
from services.cache_service import get_cached, add_to_cache

router = APIRouter()
logger = logging.getLogger("chat_router")

CASUAL_INTENTS = {"GENERAL_CHAT"}


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Receive a student's message along with context,
    run through the LangGraph 7-node pipeline,
    and return the AI reply.
    """
    logger.info("Received chat request from student: %s", request.student_name)

    try:
        # ── Cache check for simple curriculum questions ────────────────────────
        has_images = bool(request.images) or bool(request.image_base64)
        if not has_images and not request.history:
            cached = get_cached(request.message)
            if cached:
                logger.info("Cache hit for: %s", request.student_name)
                return ChatResponse(
                    reply=cached["answer"],
                    detected_mode=cached["mode"],
                    is_flagged=False,
                )

        # ── Build initial state for LangGraph ─────────────────────────────────
        history_dicts = [
            {"role": m.role, "content": m.content}
            for m in request.history
        ]

        initial_state: ChatState = {
            # Input fields
            "student_name": request.student_name,
            "grade": request.grade,
            "message": request.message,
            "history": history_dicts,
            "images": request.images or [],
            "image_base64": request.image_base64,
            "image_mime_type": request.image_mime_type,

            # Schedule context
            "today_tasks": request.today_tasks or [],
            "upcoming_exams": request.upcoming_exams or [],
            "active_goals": request.active_goals or [],
            "preferred_study_time": request.preferred_study_time,
            "latest_mood_score": request.latest_mood_score,
            "mood_label": request.mood_label,
            "tasks_completed_this_week": request.tasks_completed_this_week or 0,
            "tasks_total_this_week": request.tasks_total_this_week or 0,

            # Intermediate fields
            "intent": None,
            "emotional_state": None,
            "academic_pressure": None,
            "is_crisis": False,
            "schedule_context_summary": None,

            # Output fields
            "reply": "",
            "detected_mode": "curriculum",
            "is_flagged": False,
            "flag_reason": None,
            "sentiment": None,
            "severity": None,
        }

        # ── Run LangGraph pipeline ────────────────────────────────────────────
        result = pipeline.invoke(initial_state)

        # ── Cache curriculum responses ────────────────────────────────────────
        if (
            result.get("detected_mode") == "curriculum"
            and not has_images
            and not request.history
            and not result.get("is_flagged")
        ):
            add_to_cache(request.message, result["reply"], result["detected_mode"])

        logger.info(
            "Response completed for %s | mode=%s | flagged=%s",
            request.student_name,
            result.get("detected_mode"),
            result.get("is_flagged"),
        )

        return ChatResponse(
            reply=result["reply"],
            detected_mode=result["detected_mode"],
            is_flagged=result.get("is_flagged", False),
            flag_reason=result.get("flag_reason"),
            sentiment=result.get("sentiment"),
            severity=result.get("severity"),
        )

    except Exception as e:
        logger.error(
            "Error in chat endpoint for %s: %s",
            request.student_name, str(e), exc_info=True
        )
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")