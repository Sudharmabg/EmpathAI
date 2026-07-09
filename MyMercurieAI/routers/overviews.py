"""
routers/overviews.py
────────────────────────────────────────────────────────────────────────────────
Internal endpoints consumed by the Java Spring Boot backend.
These replace the ChromaDB HTTP API calls that the backend previously made.

All endpoints are protected by the INTERNAL_API_KEY header check.

Routes:
  POST /internal/overviews/search   — semantic search over psychologist_overviews
  POST /internal/profiles/upsert    — upsert an assessment report as a vector doc
  POST /internal/profiles/search    — semantic search over assessment_profile_docs
"""

import logging
import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel

from curriculum.vector_store import (
    search_psychologist_overviews,
    upsert_assessment_profile,
    search_assessment_profiles,
    get_all_psychologist_overviews,
    clear_all_psychologist_overviews,
    delete_psychologist_overview,
    upsert_psychologist_overview,
)

logger = logging.getLogger("overviews_router")
router = APIRouter(prefix="/internal", tags=["internal"])


# ── Auth dependency ───────────────────────────────────────────────────────────

def verify_internal_key(x_api_key: str = Header(..., alias="X-API-Key")) -> None:
    """Reject requests that don't carry the correct internal API key."""
    expected = os.getenv("INTERNAL_API_KEY", "")
    if not expected or x_api_key != expected:
        raise HTTPException(status_code=403, detail="Forbidden: invalid internal API key")


# ── Request / Response schemas ────────────────────────────────────────────────

class OverviewSearchRequest(BaseModel):
    query: str
    top_n: int = 5


class OverviewSearchResponse(BaseModel):
    documents: list[str]


class ProfileUpsertRequest(BaseModel):
    doc_id: str
    document: str
    metadata: dict


class ProfileSearchRequest(BaseModel):
    query: str
    top_n: int = 10
    class_name: Optional[str] = None


class ProfileSearchResult(BaseModel):
    doc_id: str
    document: str
    metadata: dict
    similarity: float

class OverviewUpsertItem(BaseModel):
    doc_id: str
    document: str
    metadata: dict


class OverviewBatchUpsertRequest(BaseModel):
    items: list[OverviewUpsertItem]

# ── Helper: embed text with OpenAI ───────────────────────────────────────────

def _embed(text: str) -> list[float]:
    """
    Embed a text string using the OpenAI text-embedding-3-small model.
    This is the same model used for curriculum embeddings.
    """
    import openai
    client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/overviews/search",
    response_model=OverviewSearchResponse,
    dependencies=[Depends(verify_internal_key)],
)
def search_overviews(req: OverviewSearchRequest):
    """
    Semantic search over psychologist_overviews table.
    Called by the Java backend's AIAnalysisService to get relevant
    psychological interpretation docs before building the LLM prompt.
    """
    try:
        logger.info("overview search query length=%d top_n=%d", len(req.query), req.top_n)
        embedding = _embed(req.query)
        results = search_psychologist_overviews(embedding, top_k=req.top_n)
        documents = [r["document"] for r in results]
        logger.info("overview search returned %d results", len(documents))
        return OverviewSearchResponse(documents=documents)
    except Exception as e:
        logger.error("overview search failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Overview search failed: {str(e)}")


@router.post(
    "/profiles/upsert",
    dependencies=[Depends(verify_internal_key)],
)
def upsert_profile(req: ProfileUpsertRequest):
    """
    Upsert a student assessment report document into assessment_profile_docs.
    Called asynchronously by the Java backend after saving an AssessmentReport.
    """
    try:
        logger.info("profile upsert doc_id=%s", req.doc_id)
        embedding = _embed(req.document)
        upsert_assessment_profile(
            doc_id=req.doc_id,
            document=req.document,
            embedding=embedding,
            metadata=req.metadata,
        )
        logger.info("profile upsert success doc_id=%s", req.doc_id)
        return {"status": "ok", "doc_id": req.doc_id}
    except Exception as e:
        logger.error("profile upsert failed doc_id=%s: %s", req.doc_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Profile upsert failed: {str(e)}")


@router.post(
    "/profiles/search",
    response_model=list[ProfileSearchResult],
    dependencies=[Depends(verify_internal_key)],
)
def search_profiles(req: ProfileSearchRequest):
    """
    Semantic search over assessment_profile_docs table.
    Optionally filters by className inside the metadata JSONB column.
    Called by the Java backend's POST /api/assessment/search endpoint.
    """
    try:
        logger.info(
            "profile search query length=%d top_n=%d class_name=%s",
            len(req.query), req.top_n, req.class_name,
        )
        embedding = _embed(req.query)
        results = search_assessment_profiles(
            query_embedding=embedding,
            top_k=req.top_n,
            class_name=req.class_name,
        )
        logger.info("profile search returned %d results", len(results))
        return [
            ProfileSearchResult(
                doc_id=r["doc_id"],
                document=r["document"],
                metadata=r["metadata"] or {},
                similarity=r["similarity"],
            )
            for r in results
        ]
    except Exception as e:
        logger.error("profile search failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Profile search failed: {str(e)}")


@router.get(
    "/overviews",
    dependencies=[Depends(verify_internal_key)],
)
def list_overviews():
    """Retrieve all psychologist overviews from pgvector."""
    try:
        results = get_all_psychologist_overviews()
        return results
    except Exception as e:
        logger.error("Failed to list psychologist overviews: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/overviews/batch-upsert",
    dependencies=[Depends(verify_internal_key)],
)
def batch_upsert_overviews(req: OverviewBatchUpsertRequest):
    """Embed and upsert multiple psychologist overviews in batch."""
    try:
        logger.info("Batch upserting %d psychologist overviews...", len(req.items))
        for item in req.items:
            embedding = _embed(item.document)
            upsert_psychologist_overview(
                doc_id=item.doc_id,
                document=item.document,
                embedding=embedding,
                metadata=item.metadata,
            )
        logger.info("Batch upsert complete.")
        return {"status": "ok", "count": len(req.items)}
    except Exception as e:
        logger.error("Failed to batch upsert psychologist overviews: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete(
    "/overviews/clear",
    dependencies=[Depends(verify_internal_key)],
)
def clear_overviews():
    """Delete all psychologist overviews from pgvector."""
    try:
        clear_all_psychologist_overviews()
        logger.info("Cleared all psychologist overviews from database.")
        return {"status": "ok"}
    except Exception as e:
        logger.error("Failed to clear psychologist overviews: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete(
    "/overviews/{doc_id}",
    dependencies=[Depends(verify_internal_key)],
)
def delete_overview(doc_id: str):
    """Delete a specific psychologist overview by doc_id."""
    try:
        delete_psychologist_overview(doc_id)
        logger.info("Deleted psychologist overview doc_id=%s", doc_id)
        return {"status": "ok"}
    except Exception as e:
        logger.error("Failed to delete psychologist overview: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
