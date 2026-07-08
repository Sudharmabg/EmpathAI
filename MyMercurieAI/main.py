"""
main.py — MyMercurie FastAPI application entry point
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
import contextvars
import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from routers import chat, curriculum_ingest, curriculum_ai, overviews

# ── Logging & Request Context ──────────────────────────────────────────────────
request_id_var = contextvars.ContextVar("request_id", default="unknown")

def add_request_id(logger, method_name, event_dict):
    event_dict["request_id"] = request_id_var.get()
    return event_dict

# Configure structlog
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        add_request_id,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

# Set up root logger with structlog JSON formatter
handler = logging.StreamHandler()
formatter = structlog.stdlib.ProcessorFormatter(
    processor=structlog.processors.JSONRenderer(),
    foreign_pre_chain=[
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        add_request_id,
        structlog.processors.TimeStamper(fmt="iso"),
    ]
)
handler.setFormatter(formatter)
root_logger = logging.getLogger()
root_logger.handlers = [handler]
root_logger.setLevel(logging.INFO)

logger = logging.getLogger("main")

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="MyMercurie Chatbot Service",
    description=(
        "Python AI microservice powering the MyMercurie chatbot "
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

@app.middleware("http")
async def add_request_id_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", "unknown")
    token = request_id_var.set(request_id)
    try:
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response
    finally:
        request_id_var.reset(token)

app.include_router(chat.router)
app.include_router(curriculum_ingest.router)
app.include_router(curriculum_ai.router)
app.include_router(overviews.router)


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
        
        from curriculum.vector_store import setup_pgvector
        setup_pgvector()
        logger.info("pgvector table setup complete")
    except Exception as exc:
        logger.warning("Warm-up failed (non-fatal): %s", exc)


# ── Health check & Metrics ────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    logger.info("Health check called")
    return {"status": "ok", "service": "MyMercurie AI Service"}

@app.get("/metrics")
def get_metrics():
    from services.metrics_service import metrics
    return metrics


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
        from services.cache_service import close_executor
        close_executor()
    except Exception as exc:
        logger.error("Error shutting down cache executor: %s", exc)

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
    try:
        from services.cache_service import close_executor
        close_executor()
    except Exception as exc:
        logger.error("Error shutting down cache executor: %s", exc)