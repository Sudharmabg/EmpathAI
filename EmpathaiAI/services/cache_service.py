from sentence_transformers import SentenceTransformer
import numpy as np

_model = SentenceTransformer("all-MiniLM-L6-v2")
_cache: list[dict] = []  # {embedding, answer, mode}
SIMILARITY_THRESHOLD = 0.92


def get_cached(question: str) -> dict | None:
    if not _cache:
        return None
    q_emb = _model.encode(question)
    for entry in _cache:
        sim = np.dot(q_emb, entry["embedding"]) / (
            np.linalg.norm(q_emb) * np.linalg.norm(entry["embedding"])
        )
        if sim >= SIMILARITY_THRESHOLD:
            return entry
    return None


def add_to_cache(question: str, answer: str, mode: str) -> None:
    _cache.append({"embedding": _model.encode(question), "answer": answer, "mode": mode})
