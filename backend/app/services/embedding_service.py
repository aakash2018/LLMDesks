"""
Vector embedding pipeline: file ingestion → chunking → embedding → Qdrant.
"""

import uuid
from pathlib import Path
from typing import List

import structlog
from langchain_text_splitters  import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import (
    PyPDFLoader,
    CSVLoader,
    TextLoader,
    Docx2txtLoader,
)
from langchain_openai import OpenAIEmbeddings
from qdrant_client.models import PointStruct

from app.core.config import settings
from app.core.qdrant_client import get_qdrant_client, ensure_collection

logger = structlog.get_logger()


# ─── Embeddings Client ────────────────────────────────────────────────────────

def get_embeddings() -> OpenAIEmbeddings:
    return OpenAIEmbeddings(
        model=settings.EMBEDDING_MODEL,
        api_key=settings.OPENAI_API_KEY,
    )


# ─── Document Loading ─────────────────────────────────────────────────────────

def load_document(file_path: str) -> List:
    """Load a document based on its file extension."""
    path = Path(file_path)
    ext = path.suffix.lower()

    loaders = {
        ".pdf": PyPDFLoader,
        ".csv": CSVLoader,
        ".txt": TextLoader,
        ".docx": Docx2txtLoader,
    }

    loader_class = loaders.get(ext)
    if not loader_class:
        raise ValueError(f"Unsupported file type: {ext}")

    loader = loader_class(file_path)
    docs = loader.load()
    logger.info(f"Loaded {len(docs)} pages from {path.name}")
    return docs


# ─── Chunking ─────────────────────────────────────────────────────────────────

def chunk_documents(docs: List) -> List:
    """Split documents into overlapping chunks for embedding."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_documents(docs)
    logger.info(f"Split into {len(chunks)} chunks")
    return chunks


# ─── Embedding & Storage ──────────────────────────────────────────────────────

async def embed_and_store(agent_id: str, file_path: str, file_name: str) -> int:
    """
    Full RAG pipeline:
    1. Load document
    2. Chunk into segments
    3. Generate embeddings
    4. Store in Qdrant

    Returns the number of vectors stored.
    """
    logger.info(f"Starting embedding pipeline for agent {agent_id}, file: {file_name}")

    # Step 1: Load
    docs = load_document(file_path)

    # Step 2: Chunk
    chunks = chunk_documents(docs)

    if not chunks:
        logger.warning("No chunks generated — empty document?")
        return 0

    # Step 3: Generate embeddings
    embeddings_client = get_embeddings()
    texts = [chunk.page_content for chunk in chunks]
    vectors = await embeddings_client.aembed_documents(texts)

    # Step 4: Store in Qdrant
    collection_name = await ensure_collection(agent_id)
    qdrant = get_qdrant_client()

    points = [
        PointStruct(
            id=str(uuid.uuid4()),
            vector=vector,
            payload={
                "text": chunk.page_content,
                "source": file_name,
                "agent_id": agent_id,
                "page": chunk.metadata.get("page", 0),
            },
        )
        for chunk, vector in zip(chunks, vectors)
    ]

    # Upsert in batches of 100
    batch_size = 100
    for i in range(0, len(points), batch_size):
        batch = points[i : i + batch_size]
        await qdrant.upsert(collection_name=collection_name, points=batch)

    logger.info(f"Stored {len(points)} vectors in collection {collection_name}")
    return len(points)


# ─── Similarity Search ────────────────────────────────────────────────────────

async def similarity_search(
    agent_id: str,
    query: str,
    top_k: int = 5,
) -> str:
    """
    Search Qdrant for the most relevant document chunks.
    Returns a formatted context string for injection into the LLM prompt.
    """
    embeddings_client = get_embeddings()
    query_vector = await embeddings_client.aembed_query(query)

    collection_name = f"{settings.QDRANT_COLLECTION_PREFIX}{agent_id}"
    qdrant = get_qdrant_client()

    try:
        results = await qdrant.search(
            collection_name=collection_name,
            query_vector=query_vector,
            limit=top_k,
            score_threshold=0.6,
        )
    except Exception as e:
        logger.warning(f"Qdrant search failed: {e}")
        return ""

    if not results:
        return ""

    context_parts = []
    for i, result in enumerate(results, 1):
        payload = result.payload or {}
        text = payload.get("text", "")
        source = payload.get("source", "unknown")
        context_parts.append(f"[Source {i}: {source}]\n{text}")

    return "\n\n---\n\n".join(context_parts)
