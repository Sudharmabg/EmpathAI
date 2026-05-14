import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import chat

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(),
    ]
)
logger = logging.getLogger("main")

app = FastAPI(
    title="EmpathAI Chatbot Service",
    description="Python AI microservice powering the EmpathAI chatbot using OpenAI GPT-4o-mini.",
    version="1.0.0",
)

# Allow calls from Spring Boot backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)


@app.get("/health")
def health_check():
    logger.info("Health check endpoint called")
    return {"status": "ok", "service": "EmpathAI AI Service"}