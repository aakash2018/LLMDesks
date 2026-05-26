"""
PostgreSQL models for agents and agent configurations.
"""

import uuid
from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import String, Text, DateTime, ForeignKey, Boolean, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


# ─── Enums ────────────────────────────────────────────────────────────────────

class AgentPattern(str, Enum):
    RAG = "RAG"
    SQL_AGENT = "SQL_AGENT"
    MULTI_AGENT_RAG = "MULTI_AGENT_RAG"
    WORKFLOW_AGENT = "WORKFLOW_AGENT"
    TOOL_CALLING_AGENT = "TOOL_CALLING_AGENT"


class AgentStatus(str, Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


# ─── Agent Model ──────────────────────────────────────────────────────────────

class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    agent_name: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    agent_slug: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    pattern: Mapped[AgentPattern] = mapped_column(
        SAEnum(AgentPattern, name="agent_pattern_enum"),
        nullable=False,
        default=AgentPattern.RAG,
    )
    status: Mapped[AgentStatus] = mapped_column(
        SAEnum(AgentStatus, name="agent_status_enum"),
        nullable=False,
        default=AgentStatus.DRAFT,
    )

    # Data source config (JSON stored as text, could use JSONB in production)
    features: Mapped[str | None] = mapped_column(Text, nullable=True)        # JSON array
    user_interface: Mapped[str | None] = mapped_column(String(200), nullable=True)
    api_interface: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationship
    config: Mapped["AgentConfig"] = relationship(
        "AgentConfig",
        back_populates="agent",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="joined",
    )

    def __repr__(self) -> str:
        return f"<Agent id={self.id} name={self.agent_name} status={self.status}>"


# ─── AgentConfig Model ────────────────────────────────────────────────────────

class AgentConfig(Base):
    __tablename__ = "agent_configs"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    agent_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("agents.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    welcome_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    llm_model: Mapped[str] = mapped_column(String(100), default="gpt-4o-mini")
    allow_file_upload: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationship
    agent: Mapped["Agent"] = relationship("Agent", back_populates="config",lazy="joined")

    def __repr__(self) -> str:
        return f"<AgentConfig id={self.id} agent_id={self.agent_id} model={self.llm_model}>"
