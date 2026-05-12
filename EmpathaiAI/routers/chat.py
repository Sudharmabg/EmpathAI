import logging
from fastapi import APIRouter, HTTPException
from models.schemas import ChatRequest, ChatResponse
from services.openai_service import get_chat_response

router = APIRouter()
logger = logging.getLogger("chat_router")


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Receive a student's message along with conversation history,
    call OpenAI GPT-4o-mini, and return the AI reply with detected mode.
    """
    logger.info(f"Received chat request from student: {request.student_name}")
    try:
        result = get_chat_response(request)
        logger.info(f"Successfully generated response for {request.student_name} (Mode: {result.detected_mode})")
        return result
    except Exception as e:
        logger.error(f"Error in chat endpoint for student {request.student_name}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
