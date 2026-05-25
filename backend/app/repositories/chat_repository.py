"""
Chat repository: data access layer for MongoDB chat sessions and messages.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, List

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import DESCENDING


class ChatRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.sessions = db.chat_sessions
        self.messages = db.messages

    # ── Sessions ──────────────────────────────────────────────────────────────

    async def create_session(self, agent_id: str, title: Optional[str] = None) -> dict:
        now = datetime.now(timezone.utc)
        session = {
            "_id": str(uuid.uuid4()),
            "agent_id": agent_id,
            "title": title or "New Chat",
            "message_count": 0,
            "created_at": now,
            "updated_at": now,
        }
        await self.sessions.insert_one(session)
        return self._serialize(session)

    async def get_session(self, session_id: str) -> Optional[dict]:
        doc = await self.sessions.find_one({"_id": session_id})
        return self._serialize(doc) if doc else None

    async def list_sessions(self, agent_id: str, limit: int = 50) -> List[dict]:
        cursor = (
            self.sessions
            .find({"agent_id": agent_id})
            .sort("updated_at", DESCENDING)
            .limit(limit)
        )
        docs = await cursor.to_list(length=limit)
        return [self._serialize(d) for d in docs]

    async def count_sessions(self, agent_id: str) -> int:
        return await self.sessions.count_documents({"agent_id": agent_id})

    async def update_session_title(self, session_id: str, title: str):
        await self.sessions.update_one(
            {"_id": session_id},
            {"$set": {"title": title, "updated_at": datetime.now(timezone.utc)}},
        )

    async def increment_message_count(self, session_id: str):
        await self.sessions.update_one(
            {"_id": session_id},
            {
                "$inc": {"message_count": 1},
                "$set": {"updated_at": datetime.now(timezone.utc)},
            },
        )

    async def delete_session(self, session_id: str):
        await self.sessions.delete_one({"_id": session_id})
        await self.messages.delete_many({"session_id": session_id})

    # ── Messages ──────────────────────────────────────────────────────────────

    async def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        metadata: Optional[dict] = None,
    ) -> dict:
        now = datetime.now(timezone.utc)
        message = {
            "_id": str(uuid.uuid4()),
            "session_id": session_id,
            "role": role,
            "content": content,
            "timestamp": now,
            "metadata": metadata or {},
        }
        await self.messages.insert_one(message)
        await self.increment_message_count(session_id)
        return self._serialize(message)

    async def get_messages(
        self,
        session_id: str,
        limit: int = 100,
        before_id: Optional[str] = None,
    ) -> List[dict]:
        query: dict = {"session_id": session_id}

        if before_id:
            ref = await self.messages.find_one({"_id": before_id})
            if ref:
                query["timestamp"] = {"$lt": ref["timestamp"]}

        cursor = (
            self.messages
            .find(query)
            .sort("timestamp", DESCENDING)
            .limit(limit)
        )
        docs = await cursor.to_list(length=limit)
        # Return in chronological order
        return [self._serialize(d) for d in reversed(docs)]

    async def get_recent_messages(self, session_id: str, n: int = 10) -> List[dict]:
        """Get last N messages for LLM context window."""
        cursor = (
            self.messages
            .find({"session_id": session_id})
            .sort("timestamp", DESCENDING)
            .limit(n)
        )
        docs = await cursor.to_list(length=n)
        return [self._serialize(d) for d in reversed(docs)]

    # ── Utility ───────────────────────────────────────────────────────────────

    @staticmethod
    def _serialize(doc: Optional[dict]) -> Optional[dict]:
        """Convert MongoDB _id to id for API responses."""
        if doc is None:
            return None
        result = dict(doc)
        result["id"] = str(result.pop("_id"))
        return result
