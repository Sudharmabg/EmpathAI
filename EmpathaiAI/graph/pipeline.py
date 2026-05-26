"""
graph/pipeline.py
─────────────────────────────────────────────────────────────────────────────
Fast-path optimised LangGraph pipeline.

                        BEFORE (every message)
                        ──────────────────────
  context_loader → intent_classifier → emotion_evaluator → schedule_reasoner
  → crisis_evaluator → empathy_validator → response_generator → response_logger
  (4 LLM calls for a simple "who built Qutub Minar" question → 3–4 s)

                        AFTER
                        ─────
  fast_path_classifier (0 ms, rule-based)
        │
        ├─ FAST (simple curriculum) ──────────────────────────────────────────
        │    └─ context_loader → response_generator → response_logger
        │       (1 LLM call → ~0.8–1.2 s)
        │
        └─ SLOW (emotional / schedule / ambiguous) ───────────────────────────
             └─ context_loader → intent_classifier → emotion_evaluator
                → schedule_reasoner → crisis_evaluator → empathy_validator
                → response_generator → response_logger
                (full safety pipeline, unchanged)

Safety guarantee: the fast path is only taken when the message passes ALL
five gates in fast_path_classifier (no emotional/crisis keywords, short,
no images, no first-person emotional phrasing). Anything ambiguous or
potentially sensitive always goes through the full pipeline.
"""

import logging
import sqlite3

from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.graph import END, StateGraph

from graph.nodes.context_loader import context_loader
from graph.nodes.crisis_evaluator import crisis_evaluator
from graph.nodes.emotion_evaluator import emotion_evaluator
from graph.nodes.empathy_validator import empathy_validator
from graph.nodes.fast_path_classifier import fast_path_classifier
from graph.nodes.intent_classifier import intent_classifier
from graph.nodes.response_generator import response_generator
from graph.nodes.response_logger import response_logger
from graph.nodes.schedule_reasoner import schedule_reasoner
from graph.state import ChatState

logger = logging.getLogger("pipeline")

conn   = sqlite3.connect("checkpoints.db", check_same_thread=False)
memory = SqliteSaver(conn)


# ── Routing functions ─────────────────────────────────────────────────────────

def _route_after_fast_path(state: ChatState) -> str:
    """
    Immediately after fast_path_classifier:
      fast  → jump straight to context_loader then response_generator
      slow  → run the full intent/emotion/crisis chain
    """
    if state.get("fast_path"):
        logger.info("Routing: FAST PATH → context_loader (skipping LLM classifier nodes)")
        return "fast_context_loader"
    logger.info("Routing: SLOW PATH → full pipeline")
    return "context_loader"


def _route_after_crisis(state: ChatState) -> str:
    if state.get("is_crisis"):
        logger.info("Routing: crisis detected → response_logger")
        return "response_logger"
    logger.info("Routing: no crisis → empathy_validator")
    return "empathy_validator"


# ── Pipeline builder ──────────────────────────────────────────────────────────

def build_pipeline():
    graph = StateGraph(ChatState)

    # ── Register all nodes ────────────────────────────────────────────────────

    # Entry point — always runs first, zero LLM calls
    graph.add_node("fast_path_classifier", fast_path_classifier)

    # Fast path nodes (context_loader reused but registered with a second name
    # so we can route to it separately from the slow-path context_loader)
    graph.add_node("fast_context_loader",  context_loader)    # same function, fast alias

    # Slow path nodes (full pipeline — unchanged from original)
    graph.add_node("context_loader",       context_loader)
    graph.add_node("intent_classifier",    intent_classifier)
    graph.add_node("emotion_evaluator",    emotion_evaluator)
    graph.add_node("schedule_reasoner",    schedule_reasoner)
    graph.add_node("crisis_evaluator",     crisis_evaluator)
    graph.add_node("empathy_validator",    empathy_validator)

    # Shared tail — both paths converge here
    graph.add_node("response_generator",   response_generator)
    graph.add_node("response_logger",      response_logger)

    # ── Entry point ───────────────────────────────────────────────────────────
    graph.set_entry_point("fast_path_classifier")

    # ── Conditional split: fast vs slow ───────────────────────────────────────
    graph.add_conditional_edges(
        "fast_path_classifier",
        _route_after_fast_path,
        {
            "fast_context_loader": "fast_context_loader",  # FAST path
            "context_loader":      "context_loader",        # SLOW path
        },
    )

    # ── FAST path: context_loader → response_generator → response_logger ──────
    graph.add_edge("fast_context_loader", "response_generator")

    # ── SLOW path: full original chain ────────────────────────────────────────
    graph.add_edge("context_loader",    "intent_classifier")
    graph.add_edge("intent_classifier", "emotion_evaluator")
    graph.add_edge("emotion_evaluator", "schedule_reasoner")
    graph.add_edge("schedule_reasoner", "crisis_evaluator")

    graph.add_conditional_edges(
        "crisis_evaluator",
        _route_after_crisis,
        {
            "response_logger":   "response_logger",
            "empathy_validator": "empathy_validator",
        },
    )

    graph.add_edge("empathy_validator", "response_generator")

    # ── Shared tail ───────────────────────────────────────────────────────────
    graph.add_edge("response_generator", "response_logger")
    graph.add_edge("response_logger",    END)

    compiled = graph.compile(checkpointer=memory)
    logger.info(
        "LangGraph pipeline compiled with fast-path optimisation. "
        "Simple curriculum questions skip 3 LLM calls."
    )
    return compiled


pipeline = build_pipeline()