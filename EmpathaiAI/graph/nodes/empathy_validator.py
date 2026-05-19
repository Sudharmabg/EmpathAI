import logging
import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from graph.state import ChatState

load_dotenv()

logger = logging.getLogger("empathy_validator")


def _generate_empathy_prefix(message: str, emotional_state: str,
                              mood_summary: str, assessment_summary: str) -> str:
    """
    Generates a short empathetic opening line (1-2 sentences) that validates
    the student's feelings before the main response.
    """
    try:
        llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.7,
            api_key=os.getenv("OPENAI_API_KEY"),
            max_tokens=120,
        )

        system_prompt = """You are an empathy generator for a student wellness chatbot.

Your job: Write ONE empathetic opening line (max 2 short sentences) that:
- Acknowledges the student's feelings WITHOUT giving advice
- References their mood pattern or assessment if relevant (but subtly)
- Uses warm, non-judgmental language
- Matches the language of their message (English/Hindi/Hinglish)

DO NOT:
- Suggest solutions
- Mention "I am an AI"
- Use clinical terms
- Write more than 2 sentences

Return ONLY the empathetic line, nothing else."""

        user_prompt = f"""STUDENT MESSAGE: "{message}"
EMOTIONAL STATE: {emotional_state}
MOOD HISTORY: {mood_summary}
ASSESSMENT: {assessment_summary}

Write the empathetic opening line."""

        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ])

        return response.content.strip().strip('"').strip("'")
    except Exception as e:
        logger.warning("Failed to generate empathy prefix: %s", e)
        # Safe fallback
        if emotional_state == "DISTRESSED":
            return "I hear you, and I'm really sorry you're going through this. Your feelings matter."
        elif emotional_state == "STRESSED":
            return "That sounds really tough. It's completely okay to feel this way."
        return ""


def empathy_validator(state: ChatState) -> ChatState:
    """
    NEW Node — Empathy Validator
    Runs ONLY for emotional messages (DISTRESSED / STRESSED).
    Generates an empathetic opening line that will be prepended
    to the response generator's output.
    """
    emotional_state = state.get("emotional_state", "NEUTRAL")
    intent = state.get("intent", "")

    # Only generate empathy for emotional messages
    if emotional_state not in ("DISTRESSED", "STRESSED") and intent != "EMOTIONAL_SUPPORT":
        state["needs_empathy_prefix"] = False
        state["empathy_prefix"] = None
        logger.info("Empathy prefix not needed (state=%s, intent=%s)", emotional_state, intent)
        return state

    message = state.get("message", "")
    mood_summary = state.get("mood_pattern_summary", "")
    assessment_summary = state.get("assessment_context_summary", "")

    prefix = _generate_empathy_prefix(message, emotional_state, mood_summary, assessment_summary)

    if prefix:
        state["needs_empathy_prefix"] = True
        state["empathy_prefix"] = prefix
        logger.info("Empathy prefix generated: %s", prefix[:80])
    else:
        state["needs_empathy_prefix"] = False
        state["empathy_prefix"] = None

    return state