"""
Qdrant vector database client for embedding storage and similarity search.
"""

from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Distance, VectorParams
import structlog

from app.core.config import settings

logger = structlog.get_logger()

_qdrant_client: AsyncQdrantClient | None = None


async def init_qdrant():
    global _qdrant_client
    _qdrant_client = AsyncQdrantClient(url=settings.QDRANT_URL)
    logger.info("Qdrant initialized")


def get_qdrant_client() -> AsyncQdrantClient:
    if _qdrant_client is None:
        raise RuntimeError("Qdrant not initialized. Call init_qdrant() first.")
    return _qdrant_client


async def get_qdrant():
    """FastAPI dependency for Qdrant."""
    yield get_qdrant_client()


async def ensure_collection(agent_id: str) -> str:
    """Create a Qdrant collection for an agent if it doesn't exist."""
    client = get_qdrant_client()
    collection_name = f"{settings.QDRANT_COLLECTION_PREFIX}{agent_id}"

    collections = await client.get_collections()
    existing = [c.name for c in collections.collections]

    if collection_name not in existing:
        await client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(
                size=settings.EMBEDDING_DIMENSION,
                distance=Distance.COSINE,
            ),
        )
        logger.info(f"Created Qdrant collection: {collection_name}")

    return collection_name


async def delete_collection(agent_id: str):
    """Delete the Qdrant collection for an agent."""
    client = get_qdrant_client()
    collection_name = f"{settings.QDRANT_COLLECTION_PREFIX}{agent_id}"
    await client.delete_collection(collection_name)
    logger.info(f"Deleted Qdrant collection: {collection_name}")
