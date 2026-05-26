"""
File upload and embedding generation endpoints.
"""

import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, BackgroundTasks
from pydantic import BaseModel
import aiofiles
import structlog

from app.core.config import settings
from app.services.embedding_service import embed_and_store

logger = structlog.get_logger()

router = APIRouter(prefix="/upload", tags=["Upload"])


class UploadResponse(BaseModel):
    file_id: str
    file_name: str
    file_size: int
    message: str


class EmbeddingResponse(BaseModel):
    file_id: str
    agent_id: str
    vectors_stored: int
    message: str


@router.post("/file", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    agent_id: str = Form(...),
):
    """
    Upload a file to the server for later embedding.
    Supported: PDF, CSV, TXT, DOCX.
    """
    # Validate file extension
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{suffix}' not supported. Allowed: {settings.ALLOWED_EXTENSIONS}",
        )

    # Validate file size
    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.MAX_UPLOAD_SIZE_MB:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({size_mb:.1f} MB). Max allowed: {settings.MAX_UPLOAD_SIZE_MB} MB",
        )

    # Save to disk
    file_id = str(uuid.uuid4())
    upload_dir = Path(settings.UPLOAD_DIR) / agent_id
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_path = upload_dir / f"{file_id}{suffix}"

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    logger.info(f"Uploaded file: {file.filename} → {file_path} ({size_mb:.2f} MB)")

    return UploadResponse(
        file_id=file_id,
        file_name=file.filename or "unknown",
        file_size=len(content),
        message="File uploaded successfully. Run /upload/embedding to generate vectors.",
    )


@router.post("/embedding", response_model=EmbeddingResponse)
async def generate_embedding(
    file_id: str = Form(...),
    agent_id: str = Form(...),
    file_name: str = Form(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    """
    Trigger the embedding pipeline for an uploaded file.
    The pipeline runs: chunking → embedding → Qdrant storage.
    """
    # Locate the file on disk
    upload_dir = Path(settings.UPLOAD_DIR) / agent_id
    matching = list(upload_dir.glob(f"{file_id}*"))

    if not matching:
        raise HTTPException(status_code=404, detail=f"File {file_id} not found for agent {agent_id}")

    file_path = str(matching[0])

    try:
        vectors_stored = await embed_and_store(agent_id, file_path, file_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Embedding failed for {file_id}: {e}")
        raise HTTPException(status_code=500, detail="Embedding pipeline failed")

    return EmbeddingResponse(
        file_id=file_id,
        agent_id=agent_id,
        vectors_stored=vectors_stored,
        message=f"Successfully embedded {vectors_stored} chunks into Qdrant.",
    )
