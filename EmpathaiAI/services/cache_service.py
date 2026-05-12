import numpy as np

_model = None
_cache: list[dict] = []  # {embedding, answer, mode}
SIMILARITY_THRESHOLD = 0.92


def get_model():
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer("all-MiniLM-L6-v2")
        except Exception as e:
            print(f"Error loading SentenceTransformer: {e}")
            return None
    return _model


def get_cached(question: str) -> dict | None:
    if not _cache:
        return None
    model = get_model()
    if not model:
        return None
    try:
        q_emb = model.encode(question)
        for entry in _cache:
            sim = np.dot(q_emb, entry["embedding"]) / (
                np.linalg.norm(q_emb) * np.linalg.norm(entry["embedding"])
            )
            if sim >= SIMILARITY_THRESHOLD:
                return entry
    except Exception as e:
        print(f"Error during cache lookup: {e}")
    return None


def add_to_cache(question: str, answer: str, mode: str) -> None:
    model = get_model()
    if not model:
        return
    try:
        _cache.append({"embedding": model.encode(question), "answer": answer, "mode": mode})
    except Exception as e:
        print(f"Error adding to cache: {e}")
