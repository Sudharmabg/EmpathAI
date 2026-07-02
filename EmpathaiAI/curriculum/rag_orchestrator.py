"""
curriculum/rag_orchestrator.py
───────────────────────────────
Unified RAG pipeline for all AI tasks:
  1. Retrieve relevant chunks from pgvector
  2. Build prompt from template
  3. Call OpenAI (GPT-4o-mini)
  4. Parse + validate JSON
  5. Retry up to MAX_RETRIES on validation failure
"""

import json
import logging
import os
from openai import OpenAI
from dotenv import load_dotenv
from curriculum.embedding_generator import generate_single_embedding
from curriculum.vector_store import similarity_search
from curriculum.prompt_engine import load_prompt
from curriculum.validators import validate_output

load_dotenv()
logger = logging.getLogger("rag_orchestrator")

_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

TOP_K_CHUNKS = 6   # Number of chunks to retrieve per query
MAX_RETRIES  = 3   # Max validation retries before giving up

# Model selection per task (balancing quality vs cost)
TASK_MODELS = {
    "FLASHCARDS": "gpt-4o-mini",
    "SUMMARY":    "gpt-4o-mini",
    "MNEMONIC":   "gpt-4o-mini",
    "MOCK_TEST":  "gpt-4o-mini",  # Adjusting for available models
}

TASK_TEMPERATURES = {
    "FLASHCARDS": 0.4,
    "SUMMARY":    0.2,
    "MNEMONIC":   0.5,
    "MOCK_TEST":  0.3,
}

TASK_MAX_TOKENS = {
    "FLASHCARDS": 3000,
    "SUMMARY":    3500,   # Increased: formulas + definitions + key points need room
    "MNEMONIC":   2000,
    "MOCK_TEST":  4000,
}


def process(
    task: str,
    chapter_id: int,
    topic: str | None,
    grade: str,
    subject: str,
    chapter: str,
) -> dict:
    """
    Full RAG pipeline for a given task.

    Args:
        task:       "FLASHCARDS" | "SUMMARY" | "MNEMONIC" | "MOCK_TEST"
        chapter_id: MySQL chapter id (for pgvector filter)
        topic:      Optional topic name (None = chapter-level)
        grade:      e.g. "Class 8"
        subject:    e.g. "Mathematics"
        chapter:    e.g. "Fractions"

    Returns:
        Validated dict matching the task's JSON schema.
    """
    # ── 0. Force chapter-level for SUMMARY (Ready Reckoner) ──────────────────
    if task == "SUMMARY":
        topic = None  # Always chapter-wide, never topic-scoped

    # ── 1. Build query string ─────────────────────────────────────────────────
    query = _build_query(task, topic or chapter, subject, grade, chapter)

    # ── 2. Embed query ────────────────────────────────────────────────────────
    logger.info("Embedding query for task=%s chapter_id=%d", task, chapter_id)
    query_embedding = generate_single_embedding(query)

    # ── 3. Vector search ──────────────────────────────────────────────────────
    results = similarity_search(
        query_embedding=query_embedding,
        chapter_id=chapter_id,
        top_k=TOP_K_CHUNKS
    )
    context = _format_chunks(results)
    logger.info("Retrieved %d chunks for task=%s", len(results), task)

    # ── 4. Build prompt ───────────────────────────────────────────────────────
    system_prompt, user_template = load_prompt(task.lower())
    user_prompt = user_template.format(
        grade=grade,
        subject=subject,
        chapter=chapter,
        topic=topic or chapter,
        context=context
    )

    # ── 5. OpenAI call + validation with retry ────────────────────────────────
    model       = TASK_MODELS[task]
    temperature = TASK_TEMPERATURES[task]
    max_tokens  = TASK_MAX_TOKENS[task]

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = _client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": user_prompt},
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                response_format={"type": "json_object"},
            )
            raw_json = json.loads(response.choices[0].message.content)
            validated = validate_output(task, raw_json)
            logger.info("Task=%s completed successfully on attempt %d", task, attempt)
            return validated

        except (json.JSONDecodeError, ValueError) as e:
            logger.warning("Task=%s attempt %d validation failed: %s", task, attempt, e)
            if attempt == MAX_RETRIES:
                raise RuntimeError(
                    f"Task {task} failed after {MAX_RETRIES} attempts. Last error: {e}"
                )

    return {}


def _build_query(task: str, topic: str, subject: str, grade: str, chapter: str = "") -> str:
    """Build a descriptive retrieval query for embedding."""
    query_map = {
        "FLASHCARDS": f"Key concepts and definitions for {topic} in {subject} {grade}",
        "SUMMARY":    f"All main ideas, formulas, equations, definitions, and learning objectives for the complete chapter '{chapter}' in {subject} {grade}",
        "MNEMONIC":   f"Important terms, formulas, and memory devices for {topic} in {subject} {grade}",
        "MOCK_TEST":  f"Questions, exercises, examples, and concepts for {topic} in {subject} {grade}",
    }
    return query_map.get(task, f"{topic} {subject} {grade}")


def _format_chunks(results: list[dict]) -> str:
    """Format retrieved chunks into a numbered context string for the prompt."""
    if not results:
        return "No curriculum content available for this chapter."

    lines = ["CURRICULUM CONTEXT (use only this content to generate your response):"]
    for i, r in enumerate(results, 1):
        chunk_type = r.get("chunk_type", "")
        topic = r.get("topic") or ""
        text = r.get("chunk_text", "")
        lines.append(f"\n[{i}] {chunk_type} — {topic}")
        lines.append(text[:1000])  # limit each chunk to ~250 words
    return "\n".join(lines)
