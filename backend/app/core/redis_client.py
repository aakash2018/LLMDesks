"""
Async Redis client for caching, sessions, and background queues.
"""

import redis.asyncio as aioredis
import structlog

from app.core.config import settings

logger = structlog.get_logger()

_redis_client: aioredis.Redis | None = None


async def init_redis():
    global _redis_client
    _redis_client = aioredis.from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True,
        max_connections=20,
    )
    # Verify connection
    await _redis_client.ping()
    logger.info("Redis initialized")


async def close_redis():
    global _redis_client
    if _redis_client:
        await _redis_client.aclose()
    logger.info("Redis connection closed")


def get_redis_client() -> aioredis.Redis:
    if _redis_client is None:
        raise RuntimeError("Redis not initialized. Call init_redis() first.")
    return _redis_client


async def get_redis():
    """FastAPI dependency for Redis."""
    yield get_redis_client()


# ─── Cache Helpers ────────────────────────────────────────────────────────────

async def cache_set(key: str, value: str, ttl: int = 300):
    """Set a cache value with TTL (default 5 minutes)."""
    client = get_redis_client()
    await client.setex(key, ttl, value)


async def cache_get(key: str) -> str | None:
    """Get a cached value."""
    client = get_redis_client()
    return await client.get(key)


async def cache_delete(key: str):
    """Delete a cached value."""
    client = get_redis_client()
    await client.delete(key)


async def cache_delete_pattern(pattern: str):
    """Delete all keys matching a pattern."""
    client = get_redis_client()
    keys = await client.keys(pattern)
    if keys:
        await client.delete(*keys)
