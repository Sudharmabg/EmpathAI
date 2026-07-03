"""
curriculum/vector_store.py
──────────────────────────
Handles pgvector INSERT and cosine-similarity search for curriculum embeddings.
Uses a dedicated connection pool (separate from LangGraph's pool in pipeline.py).
"""

import logging
import os
from typing import Optional
import psycopg2
from psycopg2.pool import ThreadedConnectionPool
import numpy as np
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("vector_store")

# ── Connection pool ───────────────────────────────────────────────────────────
_pool: Optional[ThreadedConnectionPool] = None

def get_pool() -> ThreadedConnectionPool:
    global _pool
    if _pool is None:
        _pool = ThreadedConnectionPool(
            minconn=1,
            maxconn=5,
            dsn=os.getenv("PGVECTOR_URL")
        )
        logger.info("pgvector connection pool initialised")
    return _pool

# ── Setup (called on startup) ─────────────────────────────────────────────────

def setup_pgvector():
    """Ensure the extension and table exist. Called from main.py startup."""
    conn = get_pool().getconn()
    try:
        with conn.cursor() as cur:
            cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS curriculum_embeddings (
                    id         BIGSERIAL PRIMARY KEY,
                    chapter_id BIGINT NOT NULL,
                    chunk_id   BIGINT NOT NULL,
                    chunk_text TEXT NOT NULL,
                    chunk_type VARCHAR(50) NOT NULL,
                    embedding  VECTOR(1536) NOT NULL,
                    grade      VARCHAR(30),
                    subject    VARCHAR(100),
                    chapter    VARCHAR(300),
                    topic      VARCHAR(300),
                    metadata   JSONB,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW()
                );
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_emb_chapter ON curriculum_embeddings(chapter_id);
            """)
        conn.commit()
        logger.info("pgvector table ready")
    finally:
        get_pool().putconn(conn)

# ── Insert ────────────────────────────────────────────────────────────────────

def insert_embedding(
    chapter_id: int,
    chunk_id: int,
    chunk_text: str,
    chunk_type: str,
    embedding: list[float],
    grade: str,
    subject: str,
    chapter: str,
    topic: Optional[str],
    metadata: dict
) -> int:
    """Insert one chunk embedding. Returns the new row id."""
    conn = get_pool().getconn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO curriculum_embeddings
                    (chapter_id, chunk_id, chunk_text, chunk_type, embedding,
                     grade, subject, chapter, topic, metadata)
                VALUES (%s, %s, %s, %s, %s::vector, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                chapter_id, chunk_id, chunk_text, chunk_type,
                f"[{','.join(map(str, embedding))}]",
                grade, subject, chapter, topic, 
                __import__('json').dumps(metadata)
            ))
            row_id = cur.fetchone()[0]
        conn.commit()
        return row_id
    finally:
        get_pool().putconn(conn)

# ── Search ────────────────────────────────────────────────────────────────────

def similarity_search(
    query_embedding: list[float],
    chapter_id: Optional[int] = None,
    subject: Optional[str] = None,
    grade: Optional[str] = None,
    top_k: int = 5
) -> list[dict]:
    """
    Cosine similarity search against curriculum_embeddings.
    Filters by chapter_id, subject, and/or grade when provided.
    Returns top_k results with chunk_text and metadata.
    """
    conn = get_pool().getconn()
    try:
        conditions = []
        params = [f"[{','.join(map(str, query_embedding))}]"]

        if chapter_id is not None:
            conditions.append(f"chapter_id = %s")
            params.append(chapter_id)
        if subject:
            conditions.append("LOWER(subject) = LOWER(%s)")
            params.append(subject)
        if grade:
            conditions.append("LOWER(grade) = LOWER(%s)")
            params.append(grade)

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        with conn.cursor() as cur:
            cur.execute(f"""
                SELECT id, chunk_id, chunk_text, chunk_type, topic, metadata,
                       1 - (embedding <=> %s::vector) AS similarity
                FROM curriculum_embeddings
                {where_clause}
                ORDER BY embedding <=> %s::vector
                LIMIT %s
            """, [params[0]] + params[1:] + [params[0], top_k])

            rows = cur.fetchall()
            return [
                {
                    "id": r[0],
                    "chunk_id": r[1],
                    "chunk_text": r[2],
                    "chunk_type": r[3],
                    "topic": r[4],
                    "metadata": r[5],
                    "similarity": float(r[6]),
                }
                for r in rows
            ]
    finally:
        get_pool().putconn(conn)

# ── Delete ────────────────────────────────────────────────────────────────────

def delete_by_chapter(chapter_id: int):
    """Remove all embeddings for a chapter (used if chapter is re-processed)."""
    conn = get_pool().getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM curriculum_embeddings WHERE chapter_id = %s",
                (chapter_id,)
            )
        conn.commit()
        logger.info("Deleted embeddings for chapter_id=%d", chapter_id)
    finally:
        get_pool().putconn(conn)
