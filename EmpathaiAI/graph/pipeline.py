import logging
from langgraph.graph import StateGraph, END
from graph.state import ChatState
from graph.nodes.context_loader import context_loader
from graph.nodes.intent_classifier import intent_classifier
from graph.nodes.emotion_evaluator import emotion_evaluator
from graph.nodes.schedule_reasoner import schedule_reasoner
from graph.nodes.crisis_evaluator import crisis_evaluator
from graph.nodes.empathy_validator import empathy_validator
from graph.nodes.response_generator import response_generator
from graph.nodes.response_logger import response_logger

logger = logging.getLogger("pipeline")


def _route_after_crisis(state: ChatState) -> str:
    """Routes to response_logger if crisis, else continues to empathy check."""
    if state.get("is_crisis"):
        logger.info("Routing to response_logger (crisis detected)")
        return "response_logger"
    logger.info("Routing to empathy_validator (no crisis)")
    return "empathy_validator"


def build_pipeline():
    graph = StateGraph(ChatState)

    # ── Register all nodes ────────────────────────────────────────────────────
    graph.add_node("context_loader", context_loader)
    graph.add_node("intent_classifier", intent_classifier)
    graph.add_node("emotion_evaluator", emotion_evaluator)
    graph.add_node("schedule_reasoner", schedule_reasoner)
    graph.add_node("crisis_evaluator", crisis_evaluator)
    graph.add_node("empathy_validator", empathy_validator)
    graph.add_node("response_generator", response_generator)
    graph.add_node("response_logger", response_logger)

    # ── Define linear flow ────────────────────────────────────────────────────
    graph.set_entry_point("context_loader")
    graph.add_edge("context_loader", "intent_classifier")
    graph.add_edge("intent_classifier", "emotion_evaluator")
    graph.add_edge("emotion_evaluator", "schedule_reasoner")
    graph.add_edge("schedule_reasoner", "crisis_evaluator")

    # ── Conditional routing after crisis check ───────────────────────────────
    graph.add_conditional_edges(
        "crisis_evaluator",
        _route_after_crisis,
        {
            "response_logger": "response_logger",
            "empathy_validator": "empathy_validator",
        }
    )

    # ── Empathy → Response → Logger → End ────────────────────────────────────
    graph.add_edge("empathy_validator", "response_generator")
    graph.add_edge("response_generator", "response_logger")
    graph.add_edge("response_logger", END)

    compiled = graph.compile()
    logger.info("LangGraph pipeline compiled successfully (with empathy validator)")
    return compiled


pipeline = build_pipeline()