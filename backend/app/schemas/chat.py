"""
Pydantic schemas for Chat API.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class ChatSessionCreate(BaseModel):
    agent_id: str
    title: Optional[str] = None


class ChatSessionRead(BaseModel):
    id: str
    agent_id: str
    title: Optional[str]
    message_count: int
    created_at: datetime
    updated_at: datetime


class MessageCreate(BaseModel):
    session_id: str
    content: str = Field(..., min_length=1, max_length=10_000)
    file_ids: Optional[List[str]] = None


class MessageRead(BaseModel):
    id: str
    session_id: str
    role: str  # "user" | "assistant" | "system"
    content: str
    timestamp: datetime
    metadata: Optional[dict] = None


class ChatHistoryResponse(BaseModel):
    sessions: List[ChatSessionRead]
    total: int
