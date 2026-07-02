"""
curriculum/pipeline.py
───────────────────────
Orchestrates the full chapter ingestion pipeline.
Called by the /api/curriculum/ingest endpoint.
Runs in a background thread so the HTTP response returns immediately.
"""

import json
import logging
from typing import Callable, Optional

from curriculum.metadata_generator import generate_metadata
from curriculum.educational_chunker import chunk_chapter
from curriculum.embedding_generator import generate_embeddings
from curriculum.vector_store import insert_embedding, delete_by_chapter

logger = logging.getLogger("curriculum_pipeline")


def run_pipeline(
    chapter_id: int,
    raw_text: str,
    grade: str,
    subject: str,
    chapter_title: str,
    board: str,
    chapter_number: Optional[int],
    manual_subtopics: Optional[list],
    on_status_update: Callable[[int, str, Optional[dict]], None]
):
    """
    Full ingestion pipeline:
      1. Generate metadata via GPT-4o-mini
      2. Chunk chapter educationally
      3. Generate embeddings for all chunks
      4. Store in pgvector
      5. Report status updates via callback

    Args:
        chapter_id:       MySQL chapter id
        raw_text:         Pasted chapter content
        grade:            e.g. "Class 8"
        subject:          e.g. "Mathematics"
        chapter_title:    e.g. "Fractions"
        board:            e.g. "CBSE"
        on_status_update: Callback(chapter_id, status, metadata_dict)
                          Called at each stage with PROCESSING/PROCESSED/FAILED + metadata
    """
    logger.info("Pipeline starting for chapter_id=%d title='%s'", chapter_id, chapter_title)

    try:
        # ── Step 1: Generate metadata ─────────────────────────────────────────
        on_status_update(chapter_id, "PROCESSING", None)
        metadata = generate_metadata(raw_text, grade, subject, chapter_title, board)
        if manual_subtopics:
            metadata["subtopics"] = manual_subtopics
            
        topics = metadata.get("topics", [])
        logger.info("Metadata generated: %d topics", len(topics))

        # ── Step 2: Chunk chapter ─────────────────────────────────────────────
        chunks = chunk_chapter(raw_text, grade, subject, chapter_title, topics)
        logger.info("Chapter split into %d chunks", len(chunks))

        # ── Step 3: Generate embeddings ───────────────────────────────────────
        texts = [c.text for c in chunks]
        embeddings = generate_embeddings(texts)

        # ── Step 4: Delete old embeddings for this chapter (idempotent) ───────
        delete_by_chapter(chapter_id)

        # ── Step 5: Store in pgvector ─────────────────────────────────────────
        # chunk_id is a placeholder index since MySQL chunks aren't stored first.
        # A full implementation would save chunks to MySQL curriculum_chunks and
        # use the real IDs. For now, we use the loop index as chunk_id.
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            insert_embedding(
                chapter_id=chapter_id,
                chunk_id=i,
                chunk_text=chunk.text,
                chunk_type=chunk.chunk_type,
                embedding=embedding,
                grade=grade,
                subject=subject,
                chapter=chapter_title,
                topic=chunk.topic,
                metadata=chunk.metadata,
            )

        logger.info("All %d embeddings stored in pgvector", len(embeddings))

        # ── Step 6: Notify success with metadata ──────────────────────────────
        on_status_update(chapter_id, "PROCESSED", metadata)

    except Exception as e:
        logger.error("Pipeline failed for chapter_id=%d: %s", chapter_id, e, exc_info=True)
        on_status_update(chapter_id, "FAILED", None)
        raise
