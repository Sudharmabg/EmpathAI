import logging
import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from graph.state import ChatState

load_dotenv()

logger = logging.getLogger("intent_classifier")

VALID_INTENTS = {
    "SCHEDULE_QUERY", "SCHEDULE_ACTION", "EMOTIONAL_SUPPORT",
    "GENERAL_CHAT", "PROGRESS_QUERY", "CRISIS", "CURRICULUM",
}

CRISIS_KEYWORDS = [
    "suicide", "kill myself", "end my life", "want to die",
    "self harm", "self-harm", "hurt myself", "no reason to live",
]


def intent_classifier(state: ChatState) -> ChatState:
    message = state.get("message", "")
    message_lower = message.lower()

    if any(kw in message_lower for kw in CRISIS_KEYWORDS):
        state["intent"] = "CRISIS"
        logger.info("Intent classified as CRISIS via keyword match")
        return state

    try:
        llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0,
            api_key=os.getenv("OPENAI_API_KEY")
        )

        prompt = f"""Classify the student's message into EXACTLY ONE category:
- SCHEDULE_QUERY: asking what to study, about tasks, schedule, or exams
- SCHEDULE_ACTION: wants to add, change, or plan a specific task
- EMOTIONAL_SUPPORT: expressing stress, sadness, anxiety, or personal problems
- GENERAL_CHAT: casual conversation, greetings, small talk
- PROGRESS_QUERY: asking about weekly progress or performance
- CRISIS: self-harm, suicidal thoughts, wanting to die
- CURRICULUM: school subject help, homework, concept explanation, math

Student message: "{message}"

Reply with ONLY the category label."""

        response = llm.invoke([HumanMessage(content=prompt)])
        intent = response.content.strip().upper()
        state["intent"] = intent if intent in VALID_INTENTS else "CURRICULUM"

    except Exception as e:
        logger.error("Intent classification failed: %s", str(e))
        state["intent"] = "CURRICULUM"

    logger.info("Intent classified as: %s", state["intent"])
    return state