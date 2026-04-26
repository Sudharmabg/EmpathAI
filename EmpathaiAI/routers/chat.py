from fastapi import APIRouter, HTTPException
from models.schemas import ChatRequest, ChatResponse
from services.openai_service import get_chat_response

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Receive a student's message along with conversation history,
    call OpenAI GPT-4o-mini, and return the AI reply with detected mode.
    """
    try:
        result = get_chat_response(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
