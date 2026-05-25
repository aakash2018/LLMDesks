"""
Async MongoDB client using Motor.
Used for chat sessions and message history.
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import structlog

from app.core.config import settings

logger = structlog.get_logger()

_mongo_client: AsyncIOMotorClient | None = None
_mongo_db: AsyncIOMotorDatabase | None = None


async def init_mongo():
    global _mongo_client, _mongo_db
    _mongo_client = AsyncIOMotorClient(settings.MONGODB_URL)
    _mongo_db = _mongo_client[settings.MONGODB_DB_NAME]

    # Create indexes for performance
    await _mongo_db.chat_sessions.create_index("agent_id")
    await _mongo_db.chat_sessions.create_index("created_at")
    await _mongo_db.messages.create_index("session_id")
    await _mongo_db.messages.create_index("timestamp")

    logger.info("MongoDB initialized")


async def close_mongo():
    global _mongo_client
    if _mongo_client:
        _mongo_client.close()
    logger.info("MongoDB connection closed")


def get_mongo_db() -> AsyncIOMotorDatabase:
    """Return the active MongoDB database instance."""
    if _mongo_db is None:
        raise RuntimeError("MongoDB not initialized. Call init_mongo() first.")
    return _mongo_db


async def get_mongo():
    """FastAPI dependency for MongoDB."""
    yield get_mongo_db()
