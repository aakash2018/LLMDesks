"""
Multi-Agent AI Platform — FastAPI Application
"""

from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import init_db, close_db
from app.core.mongodb import init_mongo, close_mongo
from app.core.redis_client import init_redis, close_redis
from app.core.qdrant_client import init_qdrant

logger = structlog.get_logger()
service_status = {
    "postgres": "not_started",
    "mongo": "not_started",
    "redis": "not_started",
    "qdrant": "not_started",
}


async def init_optional_service(name: str, init_func):
    try:
        await init_func()
    except Exception as exc:
        service_status[name] = f"unavailable: {exc}"
        logger.warning("Service unavailable during startup", service=name, error=str(exc))
    else:
        service_status[name] = "ready"


# ─── Lifespan ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup and shutdown events."""
    logger.info("Starting Multi-Agent AI Platform...")

    # Initialize service connections. Local development can still boot if a
    # backing service is offline; dependent endpoints will fail only when used.
    await init_optional_service("postgres", init_db)
    await init_optional_service("mongo", init_mongo)
    await init_optional_service("redis", init_redis)
    await init_optional_service("qdrant", init_qdrant)

    logger.info("All services connected. Platform ready.")
    yield

    # Graceful shutdown
    logger.info("Shutting down platform...")
    await close_db()
    await close_mongo()
    await close_redis()
    logger.info("Platform shutdown complete.")


# ─── App Factory ──────────────────────────────────────────────────────────────

def create_app() -> FastAPI:
    app = FastAPI(
        title="Multi-Agent AI Platform",
        description="Full-stack multi-agent AI platform with RAG, SQL agents, and workflow orchestration.",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
    )

    # ── Middleware ──
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Prometheus metrics ──
    Instrumentator().instrument(app).expose(app, endpoint="/metrics")

    # ── API routes ──
    app.include_router(api_router, prefix="/api/v1")

    # ── Health check ──
    @app.get("/health", tags=["Health"])
    async def health():
        return {"status": "healthy", "version": "1.0.0", "services": service_status}

    return app


app = create_app()
