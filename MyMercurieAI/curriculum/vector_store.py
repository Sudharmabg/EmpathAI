"""
curriculum/vector_store.py
──────────────────────────
Handles pgvector INSERT and cosine-similarity search for:
  • curriculum_embeddings  — chapter/chunk embeddings (curriculum RAG)
  • psychologist_overviews — psychological interpretation docs (replaces ChromaDB)
  • assessment_profile_docs — student assessment report docs (replaces ChromaDB)
Uses a dedicated connection pool (separate from LangGraph's pool in pipeline.py).
"""

import json
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
    """Ensure the extension and all tables exist. Called from main.py startup."""
    conn = get_pool().getconn()
    try:
        with conn.cursor() as cur:
            cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")

            # ── Curriculum embeddings (existing) ──────────────────────────────
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

            # ── Psychologist overviews (replaces ChromaDB collection) ─────────
            cur.execute("""
                CREATE TABLE IF NOT EXISTS psychologist_overviews (
                    id           BIGSERIAL PRIMARY KEY,
                    doc_id       VARCHAR(200) NOT NULL UNIQUE,
                    document     TEXT NOT NULL,
                    embedding    VECTOR(1536) NOT NULL,
                    metadata     JSONB,
                    created_at   TIMESTAMP NOT NULL DEFAULT NOW()
                );
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_psych_doc_id
                ON psychologist_overviews(doc_id);
            """)

            # ── Assessment profile docs (replaces ChromaDB student profiles) ──
            cur.execute("""
                CREATE TABLE IF NOT EXISTS assessment_profile_docs (
                    id           BIGSERIAL PRIMARY KEY,
                    doc_id       VARCHAR(200) NOT NULL UNIQUE,
                    document     TEXT NOT NULL,
                    embedding    VECTOR(1536) NOT NULL,
                    metadata     JSONB,
                    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
                    updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
                );
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_profile_doc_id
                ON assessment_profile_docs(doc_id);
            """)

        conn.commit()
        logger.info("pgvector tables ready (curriculum_embeddings, psychologist_overviews, assessment_profile_docs)")
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

# ── Delete (curriculum) ───────────────────────────────────────────────────────

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


# ── Psychologist Overviews ────────────────────────────────────────────────────

def upsert_psychologist_overview(
    doc_id: str,
    document: str,
    embedding: list[float],
    metadata: dict,
) -> None:
    """
    Insert or update a psychologist overview document.
    Uses ON CONFLICT (doc_id) to upsert.
    """
    conn = get_pool().getconn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO psychologist_overviews (doc_id, document, embedding, metadata)
                VALUES (%s, %s, %s::vector, %s)
                ON CONFLICT (doc_id) DO UPDATE
                    SET document   = EXCLUDED.document,
                        embedding  = EXCLUDED.embedding,
                        metadata   = EXCLUDED.metadata
            """, (
                doc_id,
                document,
                f"[{','.join(map(str, embedding))}]",
                json.dumps(metadata),
            ))
        conn.commit()
        logger.debug("Upserted psychologist overview doc_id=%s", doc_id)
    finally:
        get_pool().putconn(conn)


def search_psychologist_overviews(
    query_embedding: list[float],
    top_k: int = 5,
) -> list[dict]:
    """
    Cosine similarity search over psychologist_overviews.
    Returns top_k results with document text and metadata.
    """
    conn = get_pool().getconn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT doc_id, document, metadata,
                       1 - (embedding <=> %s::vector) AS similarity
                FROM psychologist_overviews
                ORDER BY embedding <=> %s::vector
                LIMIT %s
            """, (
                f"[{','.join(map(str, query_embedding))}]",
                f"[{','.join(map(str, query_embedding))}]",
                top_k,
            ))
            rows = cur.fetchall()
            return [
                {
                    "doc_id":     r[0],
                    "document":   r[1],
                    "metadata":   r[2],
                    "similarity": float(r[3]),
                }
                for r in rows
            ]
    finally:
        get_pool().putconn(conn)


# ── Assessment Profile Docs ───────────────────────────────────────────────────

def upsert_assessment_profile(
    doc_id: str,
    document: str,
    embedding: list[float],
    metadata: dict,
) -> None:
    """
    Insert or update a student assessment profile document.
    Uses ON CONFLICT (doc_id) to upsert.
    """
    conn = get_pool().getconn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO assessment_profile_docs (doc_id, document, embedding, metadata)
                VALUES (%s, %s, %s::vector, %s)
                ON CONFLICT (doc_id) DO UPDATE
                    SET document   = EXCLUDED.document,
                        embedding  = EXCLUDED.embedding,
                        metadata   = EXCLUDED.metadata,
                        updated_at = NOW()
            """, (
                doc_id,
                document,
                f"[{','.join(map(str, embedding))}]",
                json.dumps(metadata),
            ))
        conn.commit()
        logger.debug("Upserted assessment profile doc_id=%s", doc_id)
    finally:
        get_pool().putconn(conn)


def search_assessment_profiles(
    query_embedding: list[float],
    top_k: int = 10,
    class_name: Optional[str] = None,
) -> list[dict]:
    """
    Cosine similarity search over assessment_profile_docs.
    Optionally filters by className inside the metadata JSONB column.
    Returns top_k results with document text and metadata.
    """
    conn = get_pool().getconn()
    try:
        params: list = [
            f"[{','.join(map(str, query_embedding))}]",
        ]
        where_clause = ""
        if class_name:
            where_clause = "WHERE metadata->>'className' = %s"
            params.append(class_name)

        # We need the embedding param twice (once for ORDER BY, once for SELECT)
        select_param = params[0]
        order_param  = params[0]

        with conn.cursor() as cur:
            cur.execute(f"""
                SELECT doc_id, document, metadata,
                       1 - (embedding <=> %s::vector) AS similarity
                FROM assessment_profile_docs
                {where_clause}
                ORDER BY embedding <=> %s::vector
                LIMIT %s
            """, [select_param] + params[1:] + [order_param, top_k])
            rows = cur.fetchall()
            return [
                {
                    "doc_id":     r[0],
                    "document":   r[1],
                    "metadata":   r[2],
                    "similarity": float(r[3]),
                }
                for r in rows
            ]
    finally:
        get_pool().putconn(conn)
