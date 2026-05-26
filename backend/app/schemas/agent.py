"""
Pydantic schemas for Agent API request/response validation.
"""

import re
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator


# ─── Config Schemas ───────────────────────────────────────────────────────────

class AgentConfigCreate(BaseModel):
    prompt: Optional[str] = Field(None, description="System prompt for the agent")
    welcome_message: Optional[str] = Field(None, description="Chat welcome message")
    llm_model: str = Field("gpt-4o-mini", description="LLM model identifier")
    allow_file_upload: bool = Field(True, description="Allow file uploads in chat")


class AgentConfigRead(AgentConfigCreate):
    id: str
    agent_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Agent Schemas ────────────────────────────────────────────────────────────

class AgentCreate(BaseModel):
    agent_name: str = Field(..., min_length=2, max_length=200, description="Unique agent name")
    description: Optional[str] = Field(None, max_length=2000)
    pattern: str = Field("RAG", description="Agent execution pattern")
    features: Optional[List[str]] = Field(None, description="Selected features")
    user_interface: Optional[str] = Field(None)
    api_interface: bool = Field(False)
    config: Optional[AgentConfigCreate] = None

    @field_validator("agent_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^[a-zA-Z0-9][a-zA-Z0-9 _-]*$", v):
            raise ValueError(
                "Agent name must start with a letter or number and contain only "
                "letters, numbers, spaces, hyphens, or underscores."
            )
        return v

    @field_validator("pattern")
    @classmethod
    def validate_pattern(cls, v: str) -> str:
        valid = {"RAG", "SQL_AGENT", "MULTI_AGENT_RAG", "WORKFLOW_AGENT", "TOOL_CALLING_AGENT"}
        if v not in valid:
            raise ValueError(f"Pattern must be one of: {', '.join(valid)}")
        return v


class AgentUpdate(BaseModel):
    agent_name: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    pattern: Optional[str] = None
    features: Optional[List[str]] = None
    user_interface: Optional[str] = None
    api_interface: Optional[bool] = None
    config: Optional[AgentConfigCreate] = None


class AgentRead(BaseModel):
    id: str
    agent_name: str
    agent_slug: str
    description: Optional[str]
    pattern: str
    status: str
    features: Optional[List[str]]
    user_interface: Optional[str]
    api_interface: bool
    created_at: datetime
    updated_at: datetime
    config: Optional[AgentConfigRead]

    class Config:
        from_attributes = True


class AgentListResponse(BaseModel):
    items: List[AgentRead]
    total: int
    page: int
    page_size: int
    has_next: bool


# ─── Filter Schemas ───────────────────────────────────────────────────────────

class AgentFilter(BaseModel):
    search: Optional[str] = None
    status: Optional[str] = None
    pattern: Optional[str] = None
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)
