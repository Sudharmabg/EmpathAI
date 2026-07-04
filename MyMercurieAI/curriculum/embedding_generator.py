"""
curriculum/embedding_generator.py
──────────────────────────────────
Calls OpenAI text-embedding-3-small for each chunk.
Batches chunks to stay within API rate limits.
"""

import logging
import os
import time
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("embedding_generator")

_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

EMBEDDING_MODEL = "text-embedding-3-small"
BATCH_SIZE = 20       # embeddings per API call
RATE_LIMIT_SLEEP = 0.5  # seconds between batches


def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """
    Generate embeddings for a list of text strings.
    Processes in batches of BATCH_SIZE to avoid rate limits.
    Returns a list of 1536-dimensional float vectors.
    """
    all_embeddings = []

    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i: i + BATCH_SIZE]
        try:
            response = _client.embeddings.create(
                model=EMBEDDING_MODEL,
                input=batch,
            )
            batch_embeddings = [item.embedding for item in response.data]
            all_embeddings.extend(batch_embeddings)

            logger.info(
                "Embedded batch %d/%d (%d chunks)",
                i // BATCH_SIZE + 1,
                (len(texts) + BATCH_SIZE - 1) // BATCH_SIZE,
                len(batch)
            )

            if i + BATCH_SIZE < len(texts):
                time.sleep(RATE_LIMIT_SLEEP)

        except Exception as e:
            logger.error("Embedding batch %d failed: %s", i // BATCH_SIZE + 1, e)
            raise

    return all_embeddings


def generate_single_embedding(text: str) -> list[float]:
    """Generate a single embedding (for query-time RAG retrieval)."""
    response = _client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=[text],
    )
    return response.data[0].embedding
