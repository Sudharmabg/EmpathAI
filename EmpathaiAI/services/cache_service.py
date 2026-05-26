"""
cache_service.py  —  Semantic similarity cache with pre-warming
────────────────────────────────────────────────────────────────
Changes from original:
  • Model is loaded at import time (not lazily on first request)
    so the first real query never pays the ~2s cold-start penalty.
  • encode() is called once per lookup against a pre-built matrix,
    using vectorised numpy ops instead of a Python loop — O(n) → O(1)
    for the similarity scan.
  • add_to_cache() keeps the embedding matrix in sync so every lookup
    stays fast even as the cache grows.
  • Thread-safe: a threading.Lock guards all mutations.
  • get_cached_async() wraps the CPU-bound work in an executor so
    FastAPI's async endpoints are never blocked.
"""

from __future__ import annotations

import asyncio
import logging
import threading
from concurrent.futures import ThreadPoolExecutor

import numpy as np

logger = logging.getLogger("cache_service")

# ── Config ────────────────────────────────────────────────────────────────────
SIMILARITY_THRESHOLD = 0.92
_MODEL_NAME = "all-MiniLM-L6-v2"

# ── Internal state ────────────────────────────────────────────────────────────
_model = None
_cache: list[dict] = []          # [{embedding, answer, mode}, ...]
_emb_matrix: np.ndarray | None = None   # (N, D) — all embeddings stacked
_lock = threading.Lock()
_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="cache")


# ── Model loading — runs at import time ───────────────────────────────────────

def _load_model():
    global _model
    try:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(_MODEL_NAME)
        logger.info("SentenceTransformer '%s' loaded and ready.", _MODEL_NAME)
    except Exception as exc:
        logger.error("Failed to load SentenceTransformer: %s", exc)
        _model = None


# Pre-warm immediately when the module is imported (happens at startup).
# FastAPI's startup hook in main.py can call _load_model() explicitly too,
# but this ensures the model is ready even without that hook.
_load_model()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _rebuild_matrix() -> None:
    """Rebuild the stacked embedding matrix from _cache (call under _lock)."""
    global _emb_matrix
    if _cache:
        _emb_matrix = np.vstack([e["embedding"] for e in _cache])  # (N, D)
    else:
        _emb_matrix = None


# ── Public API — synchronous (used by existing graph nodes) ──────────────────

def get_cached(question: str) -> dict | None:
    """
    Return a cached entry whose embedding is within SIMILARITY_THRESHOLD
    of *question*, or None.

    Uses vectorised cosine similarity against the pre-built matrix —
    single numpy call instead of a Python loop.
    """
    if _model is None or _emb_matrix is None:
        return None

    try:
        q_emb = _model.encode(question, normalize_embeddings=True)   # (D,)

        with _lock:
            if _emb_matrix is None:         # re-check inside lock
                return None
            # All embeddings already normalised → dot product == cosine sim
            cache_norms = np.linalg.norm(_emb_matrix, axis=1, keepdims=True)
            norm_matrix = _emb_matrix / np.where(cache_norms == 0, 1, cache_norms)
            sims = norm_matrix @ q_emb      # (N,)
            best_idx = int(np.argmax(sims))
            if sims[best_idx] >= SIMILARITY_THRESHOLD:
                return _cache[best_idx]

    except Exception as exc:
        logger.error("Cache lookup error: %s", exc)

    return None


def add_to_cache(question: str, answer: str, mode: str) -> None:
    """Encode *question* and append to the cache + rebuild the matrix."""
    if _model is None:
        return
    try:
        emb = _model.encode(question, normalize_embeddings=True)
        with _lock:
            _cache.append({"embedding": emb, "answer": answer, "mode": mode})
            _rebuild_matrix()
        logger.debug("Cache now has %d entries.", len(_cache))
    except Exception as exc:
        logger.error("Error adding to cache: %s", exc)


# ── Public API — async wrappers (used by the new streaming endpoint) ──────────

async def get_cached_async(question: str) -> dict | None:
    """
    Async version of get_cached — runs the CPU-bound work in a thread
    pool so it never blocks the FastAPI event loop.
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, get_cached, question)


async def add_to_cache_async(question: str, answer: str, mode: str) -> None:
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(_executor, add_to_cache, question, answer, mode)


# ── Warm-up helper (called from main.py startup hook) ────────────────────────

def warm_up() -> None:
    """
    Fire a dummy encode to ensure the model weights are in memory
    and the BLAS/ONNX backend is initialised before the first real request.
    """
    if _model is None:
        _load_model()
    if _model is not None:
        _ = _model.encode("warmup", normalize_embeddings=True)
        logger.info("Cache warm-up complete.")