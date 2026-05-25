"""
Celery worker for background task processing.
Handles long-running embedding jobs outside the request/response cycle.
"""

from celery import Celery
import structlog

from app.core.config import settings

logger = structlog.get_logger()

# ─── Celery App ───────────────────────────────────────────────────────────────

celery_app = Celery(
    "multi_agent_platform",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,    # Important for long-running tasks
    task_routes={
        "app.workers.tasks.embed_file": {"queue": "embeddings"},
        "app.workers.tasks.cleanup_agent": {"queue": "cleanup"},
    },
)


# ─── Embedding Task ───────────────────────────────────────────────────────────

@celery_app.task(
    name="app.workers.tasks.embed_file",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def embed_file_task(self, agent_id: str, file_path: str, file_name: str):
    """
    Background task: run the full embedding pipeline for a file.
    Called from the /upload/embedding endpoint for large files.
    """
    import asyncio
    from app.services.embedding_service import embed_and_store

    logger.info(f"[Task] Starting embedding: agent={agent_id}, file={file_name}")

    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        vectors = loop.run_until_complete(embed_and_store(agent_id, file_path, file_name))
        loop.close()

        logger.info(f"[Task] Embedding complete: {vectors} vectors stored")
        return {"status": "success", "vectors_stored": vectors}

    except Exception as exc:
        logger.error(f"[Task] Embedding failed: {exc}")
        raise self.retry(exc=exc)


# ─── Cleanup Task ─────────────────────────────────────────────────────────────

@celery_app.task(name="app.workers.tasks.cleanup_agent")
def cleanup_agent_task(agent_id: str):
    """
    Background task: clean up all agent resources on deletion.
    Removes Qdrant collection, uploaded files, Redis cache entries.
    """
    import asyncio
    import shutil
    from pathlib import Path
    from app.core.qdrant_client import delete_collection, init_qdrant
    from app.core.config import settings as cfg

    logger.info(f"[Task] Cleaning up agent: {agent_id}")

    try:
        # Remove uploaded files
        upload_dir = Path(cfg.UPLOAD_DIR) / agent_id
        if upload_dir.exists():
            shutil.rmtree(upload_dir)
            logger.info(f"[Task] Removed upload dir: {upload_dir}")

        # Remove Qdrant collection
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(init_qdrant())
        loop.run_until_complete(delete_collection(agent_id))
        loop.close()

        logger.info(f"[Task] Cleanup complete for agent: {agent_id}")
        return {"status": "success"}

    except Exception as exc:
        logger.error(f"[Task] Cleanup failed: {exc}")
        return {"status": "error", "detail": str(exc)}
