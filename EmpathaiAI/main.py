"""
main.py — EmpathAI FastAPI application entry point
───────────────────────────────────────────────────
Changes from original:
  • @app.on_event("startup") pre-warms the SentenceTransformer model so
    the first real request never pays the ~2 s cold-start penalty.
  • /chat/stream is automatically registered because it lives inside
    the updated chat router — no extra include needed.
"""

import logging
import os
import sys
import signal
import threading

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import chat

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger("main")

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="EmpathAI Chatbot Service",
    description=(
        "Python AI microservice powering the EmpathAI chatbot "
        "using OpenAI GPT-4o / GPT-4o-mini with SSE streaming."
    ),
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)


# ── Startup: pre-warm embedding model ─────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    """
    Called once when Uvicorn starts.  Runs the SentenceTransformer warm-up
    so the model is fully loaded before any request arrives.
    Without this, the first request after a cold start takes ~2 s extra.
    """
    logger.info("Running startup warm-up...")
    try:
        from services.cache_service import warm_up
        import asyncio
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, warm_up)
        logger.info("Startup warm-up complete — service is ready.")
    except Exception as exc:
        logger.warning("Warm-up failed (non-fatal): %s", exc)


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    logger.info("Health check called")
    return {"status": "ok", "service": "EmpathAI AI Service"}


# ── Graceful Shutdown ─────────────────────────────────────────────────────────

shutdown_event = threading.Event()

def signal_handler(signum, frame):
    logger.info("Signal %d received, setting shutdown event...", signum)
    shutdown_event.set()
    try:
        from graph.pipeline import connection_pool
        connection_pool.close()
        logger.info("PostgreSQL connection pool closed successfully via signal handler.")
    except Exception as exc:
        logger.error("Error closing connection pool: %s", exc)

try:
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
except ValueError:
    pass

@app.on_event("shutdown")
async def shutdown_event_handler():
    logger.info("FastAPI shutdown event triggered.")
    shutdown_event.set()
    try:
        from graph.pipeline import connection_pool
        connection_pool.close()
        logger.info("PostgreSQL connection pool closed successfully via shutdown event.")
    except Exception as exc:
        logger.error("Error closing connection pool: %s", exc)