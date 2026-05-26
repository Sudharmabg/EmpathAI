"""
graph/nodes/fast_path_classifier.py
─────────────────────────────────────────────────────────────────────────────
Intercepts messages BEFORE the expensive LLM chain and decides:
  • FAST  — simple curriculum / general-knowledge question
            → sets intent = CURRICULUM, skips emotion + crisis LLM calls
  • SLOW  — emotional, crisis, schedule, or ambiguous
            → lets the full pipeline run as before

This is purely rule-based (zero API calls), so it adds < 1 ms.

Decision logic
──────────────
FAST if ALL of the following are true:
  1. Message is short (≤ 25 words)          — long messages often carry nuance
  2. No emotional / crisis keywords present  — safety is never skipped
  3. No schedule keywords present            — schedule needs context_loader data
  4. No image attached                       — images need vision model routing
  5. No question about the student's own state ("my", "I feel", "am I", …)

Everything else → SLOW (full pipeline).
"""

from __future__ import annotations

import logging
import re
from graph.state import ChatState

logger = logging.getLogger("fast_path_classifier")

# ── Keyword sets ──────────────────────────────────────────────────────────────

_EMOTIONAL_KEYWORDS: frozenset[str] = frozenset({
    # distress / crisis
    "suicide", "kill", "die", "death", "dead", "hurt myself", "self harm",
    "self-harm", "end my life", "no reason to live", "want to die",
    # emotions
    "sad", "crying", "depressed", "lonely", "scared", "afraid", "hopeless",
    "worthless", "anxious", "anxiety", "panic", "stress", "stressed",
    "overwhelmed", "upset", "worried", "angry", "frustrated", "terrible",
    "horrible", "miserable", "broken", "numb", "lost", "empty",
    # relationships / social
    "bully", "bullied", "bullying", "fight", "abuse", "abused",
    "friend", "friendship", "crush", "relationship", "parents",
})

_SCHEDULE_KEYWORDS: frozenset[str] = frozenset({
    "schedule", "task", "exam", "test", "goal", "study plan",
    "today", "tomorrow", "this week", "deadline", "due", "pending",
    "progress", "completed", "tasks", "homework due", "study time",
    "remind", "reminder",
})

_FIRST_PERSON_FEEL: re.Pattern = re.compile(
    r"\b(i feel|i am feeling|i'm feeling|i felt|am i|my mood|"
    r"i have been|i've been|i can't|i cannot|i don't know|"
    r"my life|my problem|my issue|my situation|help me with my)\b",
    re.IGNORECASE,
)

_MAX_WORDS_FOR_FAST_PATH = 25


# ── Main function ─────────────────────────────────────────────────────────────

def fast_path_classifier(state: ChatState) -> ChatState:
    """
    Sets state["fast_path"] = True  → pipeline skips emotion + crisis LLM nodes
                             = False → full pipeline runs as normal
    Also pre-sets intent = "CURRICULUM" on the fast path so intent_classifier
    is skipped too.
    """
    message: str = state.get("message", "")
    words         = message.split()

    # ── Gate 1: length ────────────────────────────────────────────────────────
    if len(words) > _MAX_WORDS_FOR_FAST_PATH:
        state["fast_path"] = False
        logger.info("Fast path: SLOW (message too long — %d words)", len(words))
        return state

    # ── Gate 2: images ────────────────────────────────────────────────────────
    if state.get("images") or state.get("image_base64"):
        state["fast_path"] = False
        logger.info("Fast path: SLOW (image attached)")
        return state

    # ── Gate 3: emotional / crisis keywords ───────────────────────────────────
    lower = message.lower()
    if any(kw in lower for kw in _EMOTIONAL_KEYWORDS):
        state["fast_path"] = False
        logger.info("Fast path: SLOW (emotional keyword detected)")
        return state

    # ── Gate 4: schedule keywords ─────────────────────────────────────────────
    if any(kw in lower for kw in _SCHEDULE_KEYWORDS):
        state["fast_path"] = False
        logger.info("Fast path: SLOW (schedule keyword detected)")
        return state

    # ── Gate 5: first-person emotional phrasing ───────────────────────────────
    if _FIRST_PERSON_FEEL.search(message):
        state["fast_path"] = False
        logger.info("Fast path: SLOW (first-person emotional phrasing)")
        return state

    # ── All gates passed → FAST PATH ─────────────────────────────────────────
    state["fast_path"]       = True
    state["intent"]          = "CURRICULUM"   # skip intent_classifier LLM call
    state["emotional_state"] = "NEUTRAL"      # skip emotion_evaluator LLM call
    state["academic_pressure"] = "LOW"
    state["is_crisis"]       = False          # skip crisis_evaluator LLM call
    state["needs_empathy_prefix"] = False

    logger.info(
        "Fast path: FAST (%d words, no emotional/schedule signals) — "
        "skipping intent + emotion + crisis LLM calls",
        len(words),
    )
    return state