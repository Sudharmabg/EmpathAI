"""
chromadb-setup/load_overviews.py  (MIGRATED: now loads into pgvector)
──────────────────────────────────────────────────────────────────────
One-time seeding script.

Reads the psychologist interpretation Excel file and loads every
question-level overview into the `psychologist_overviews` pgvector
table using OpenAI text-embedding-3-small embeddings.

Usage (from the MyMercurieAI directory):
    python chromadb-setup/load_overviews.py

Environment variables required:
    OPENAI_API_KEY   — OpenAI API key
    PGVECTOR_URL     — PostgreSQL connection string, e.g.
                       postgresql://postgres:root@localhost:5432/empathai
"""

import logging
import os
import sys

import pandas as pd
from dotenv import load_dotenv

# Allow imports from the parent package (curriculum/vector_store)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s]: %(message)s")
logger = logging.getLogger("pgvector_seed")

# ── Validate environment ──────────────────────────────────────────────────────

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
PGVECTOR_URL   = os.getenv("PGVECTOR_URL", "")

if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY is not set in the environment")
if not PGVECTOR_URL:
    raise RuntimeError("PGVECTOR_URL is not set in the environment")

# ── Ensure pgvector tables exist ─────────────────────────────────────────────

from curriculum.vector_store import setup_pgvector, upsert_psychologist_overview

logger.info("Setting up pgvector tables...")
setup_pgvector()
logger.info("pgvector tables ready.")

# ── Embed helper ─────────────────────────────────────────────────────────────

import openai

_client = openai.OpenAI(api_key=OPENAI_API_KEY)

def embed(text: str) -> list[float]:
    """Embed a single text string with text-embedding-3-small (1536-dim)."""
    response = _client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding

# ── Load Excel ────────────────────────────────────────────────────────────────

EXCEL_FILE = os.path.join(os.path.dirname(__file__), "Empath.AI pitched for Std 8th.xlsx")
logger.info("Reading Excel file: %s", EXCEL_FILE)

df = pd.read_excel(EXCEL_FILE, sheet_name="Interpretations")

# Keep only columns A to F
df = df.iloc[:, :6]
df.columns = ["question", "domain", "answers", "range", "overall_meaning", "psychological_interpretation"]

# Forward-fill question and domain
df["question"] = df["question"].ffill()
df["domain"]   = df["domain"].ffill()

# Drop rows where both interpretation fields are empty
df = df[df["psychological_interpretation"].notna() | df["overall_meaning"].notna()]

# Drop rows where question is too short
df = df[df["question"].apply(lambda x: isinstance(x, str) and len(x.strip()) > 5)]

grouped = df.groupby("question", sort=False)

# ── Upsert each question-level overview ──────────────────────────────────────

total = 0
for i, (question_text, group) in enumerate(grouped):
    overview_parts = [
        f"Question: {question_text}",
        f"Domain: {group['domain'].dropna().iloc[0] if not group['domain'].dropna().empty else ''}",
        "",
    ]

    for _, row in group.iterrows():
        parts = []
        if pd.notna(row.get("answers")) and str(row["answers"]).strip():
            parts.append(f"Answer Option: {row['answers']}")
        if pd.notna(row.get("range")) and str(row["range"]).strip():
            parts.append(f"Range: {row['range']}")
        if pd.notna(row.get("overall_meaning")) and str(row["overall_meaning"]).strip():
            parts.append(f"Overall Meaning: {row['overall_meaning']}")
        if pd.notna(row.get("psychological_interpretation")) and str(row["psychological_interpretation"]).strip():
            parts.append(f"Psychological Interpretation: {row['psychological_interpretation']}")
        if parts:
            overview_parts.append(" | ".join(parts))

    overview_text = "\n".join(overview_parts)
    doc_id        = f"question_{i + 1}"
    domain_val    = str(group["domain"].dropna().iloc[0]) if not group["domain"].dropna().empty else ""

    logger.info("Embedding Q%d: %s...", i + 1, question_text[:70])
    embedding = embed(overview_text)

    upsert_psychologist_overview(
        doc_id=doc_id,
        document=overview_text,
        embedding=embedding,
        metadata={
            "question_id":   i + 1,
            "question_text": question_text[:200],
            "domain":        domain_val,
        },
    )
    total += 1
    print(f"Loaded Q{i + 1}: {question_text[:70]}...")

print(f"\nTotal loaded: {total} overviews into pgvector (psychologist_overviews) successfully.")