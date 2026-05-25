"""
Agent repository: data access layer for PostgreSQL agents.
"""

import json
import re
from typing import Optional, Tuple, List

from sqlalchemy import select, func, or_, update, delete
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import Agent, AgentConfig, AgentStatus
from app.schemas.agent import AgentCreate, AgentUpdate, AgentFilter


def _slugify(text: str) -> str:
    """Convert agent name to URL-safe slug."""
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_-]+", "-", slug)
    return slug


class AgentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Read ──────────────────────────────────────────────────────────────────

    async def get_by_id(self, agent_id: str) -> Optional[Agent]:
        result = await self.db.execute(
            select(Agent)
            .options(selectinload(Agent.config))
            .where(Agent.id == agent_id)
        )
        return result.scalar_one_or_none()

    async def get_by_slug(self, slug: str) -> Optional[Agent]:
        result = await self.db.execute(
            select(Agent)
            .options(selectinload(Agent.config))
            .where(Agent.agent_slug == slug)
        )
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Optional[Agent]:
        result = await self.db.execute(
            select(Agent).where(Agent.agent_name == name)
        )
        return result.scalar_one_or_none()

    async def list(self, filters: AgentFilter) -> Tuple[List[Agent], int]:
        """Return paginated agents with optional filters."""
        query = select(Agent).options(selectinload(Agent.config))
        count_query = select(func.count()).select_from(Agent)

        # Apply filters
        if filters.search:
            search_term = f"%{filters.search}%"
            condition = or_(
                Agent.agent_name.ilike(search_term),
                Agent.description.ilike(search_term),
            )
            query = query.where(condition)
            count_query = count_query.where(condition)

        if filters.status:
            query = query.where(Agent.status == filters.status)
            count_query = count_query.where(Agent.status == filters.status)

        if filters.pattern:
            query = query.where(Agent.pattern == filters.pattern)
            count_query = count_query.where(Agent.pattern == filters.pattern)

        # Total count
        total_result = await self.db.execute(count_query)
        total = total_result.scalar_one()

        # Pagination
        offset = (filters.page - 1) * filters.page_size
        query = (
            query
            .order_by(Agent.created_at.desc())
            .offset(offset)
            .limit(filters.page_size)
        )

        result = await self.db.execute(query)
        agents = list(result.scalars().all())

        return agents, total

    # ── Create ────────────────────────────────────────────────────────────────

    async def create(self, data: AgentCreate) -> Agent:
        slug = _slugify(data.agent_name)

        # Ensure slug uniqueness
        existing = await self.get_by_slug(slug)
        if existing:
            slug = f"{slug}-{slug[:8]}"

        agent = Agent(
            agent_name=data.agent_name,
            agent_slug=slug,
            description=data.description,
            pattern=data.pattern,
            features=json.dumps(data.features) if data.features else None,
            user_interface=data.user_interface,
            api_interface=data.api_interface,
        )

        if data.config:
            agent.config = AgentConfig(
                prompt=data.config.prompt,
                welcome_message=data.config.welcome_message,
                llm_model=data.config.llm_model,
                allow_file_upload=data.config.allow_file_upload,
            )
        else:
            agent.config = AgentConfig()

        self.db.add(agent)
        await self.db.flush()
        await self.db.refresh(agent)
        return agent

    # ── Update ────────────────────────────────────────────────────────────────

    async def update(self, agent: Agent, data: AgentUpdate) -> Agent:
        if data.agent_name is not None:
            agent.agent_name = data.agent_name
            agent.agent_slug = _slugify(data.agent_name)

        if data.description is not None:
            agent.description = data.description

        if data.pattern is not None:
            agent.pattern = data.pattern

        if data.features is not None:
            agent.features = json.dumps(data.features)

        if data.user_interface is not None:
            agent.user_interface = data.user_interface

        if data.api_interface is not None:
            agent.api_interface = data.api_interface

        if data.config and agent.config:
            if data.config.prompt is not None:
                agent.config.prompt = data.config.prompt
            if data.config.welcome_message is not None:
                agent.config.welcome_message = data.config.welcome_message
            if data.config.llm_model is not None:
                agent.config.llm_model = data.config.llm_model
            agent.config.allow_file_upload = data.config.allow_file_upload

        await self.db.flush()
        await self.db.refresh(agent)
        return agent

    async def activate(self, agent: Agent) -> Agent:
        agent.status = AgentStatus.ACTIVE
        await self.db.flush()
        await self.db.refresh(agent)
        return agent

    async def deactivate(self, agent: Agent) -> Agent:
        agent.status = AgentStatus.INACTIVE
        await self.db.flush()
        await self.db.refresh(agent)
        return agent

    # ── Delete ────────────────────────────────────────────────────────────────

    async def delete(self, agent: Agent):
        await self.db.delete(agent)
        await self.db.flush()
