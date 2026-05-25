"""
Agent service: business logic for agent CRUD operations.
"""

import json
from typing import Tuple, List, Optional

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import Agent
from app.repositories.agent_repository import AgentRepository
from app.schemas.agent import AgentCreate, AgentUpdate, AgentFilter, AgentRead, AgentListResponse
from app.core.redis_client import cache_set, cache_get, cache_delete, cache_delete_pattern

logger = structlog.get_logger()

CACHE_TTL = 300  # 5 minutes


def _serialize_agent(agent: Agent) -> dict:
    """Convert Agent ORM model to dict for API response."""
    config = None
    if agent.config:
        config = {
            "id": agent.config.id,
            "agent_id": agent.config.agent_id,
            "prompt": agent.config.prompt,
            "welcome_message": agent.config.welcome_message,
            "llm_model": agent.config.llm_model,
            "allow_file_upload": agent.config.allow_file_upload,
            "created_at": agent.config.created_at,
            "updated_at": agent.config.updated_at,
        }
    return {
        "id": agent.id,
        "agent_name": agent.agent_name,
        "agent_slug": agent.agent_slug,
        "description": agent.description,
        "pattern": agent.pattern,
        "status": agent.status,
        "features": json.loads(agent.features) if agent.features else None,
        "user_interface": agent.user_interface,
        "api_interface": agent.api_interface,
        "created_at": agent.created_at,
        "updated_at": agent.updated_at,
        "config": config,
    }


class AgentService:
    def __init__(self, db: AsyncSession):
        self.repo = AgentRepository(db)

    async def list_agents(self, filters: AgentFilter) -> AgentListResponse:
        agents, total = await self.repo.list(filters)
        items = [AgentRead(**_serialize_agent(a)) for a in agents]
        has_next = (filters.page * filters.page_size) < total
        return AgentListResponse(
            items=items,
            total=total,
            page=filters.page,
            page_size=filters.page_size,
            has_next=has_next,
        )

    async def get_agent(self, agent_id: str) -> Optional[AgentRead]:
        # Try cache first
        cached = await cache_get(f"agent:{agent_id}")
        if cached:
            return AgentRead(**json.loads(cached))

        agent = await self.repo.get_by_id(agent_id)
        if not agent:
            return None

        data = _serialize_agent(agent)
        # Cache with serializable values
        cache_data = {**data, "created_at": data["created_at"].isoformat(), "updated_at": data["updated_at"].isoformat()}
        if cache_data.get("config"):
            cache_data["config"]["created_at"] = cache_data["config"]["created_at"].isoformat()
            cache_data["config"]["updated_at"] = cache_data["config"]["updated_at"].isoformat()
        await cache_set(f"agent:{agent_id}", json.dumps(cache_data), CACHE_TTL)

        return AgentRead(**data)

    async def create_agent(self, data: AgentCreate) -> AgentRead:
        # Check name uniqueness
        existing = await self.repo.get_by_name(data.agent_name)
        if existing:
            raise ValueError(f"Agent with name '{data.agent_name}' already exists.")

        agent = await self.repo.create(data)
        logger.info(f"Created agent: {agent.id} ({agent.agent_name})")
        return AgentRead(**_serialize_agent(agent))

    async def update_agent(self, agent_id: str, data: AgentUpdate) -> AgentRead:
        agent = await self.repo.get_by_id(agent_id)
        if not agent:
            raise ValueError(f"Agent {agent_id} not found.")

        agent = await self.repo.update(agent, data)
        await cache_delete(f"agent:{agent_id}")
        return AgentRead(**_serialize_agent(agent))

    async def activate_agent(self, agent_id: str) -> AgentRead:
        agent = await self.repo.get_by_id(agent_id)
        if not agent:
            raise ValueError(f"Agent {agent_id} not found.")

        agent = await self.repo.activate(agent)
        await cache_delete(f"agent:{agent_id}")
        logger.info(f"Activated agent: {agent_id}")
        return AgentRead(**_serialize_agent(agent))

    async def deactivate_agent(self, agent_id: str) -> AgentRead:
        agent = await self.repo.get_by_id(agent_id)
        if not agent:
            raise ValueError(f"Agent {agent_id} not found.")

        agent = await self.repo.deactivate(agent)
        await cache_delete(f"agent:{agent_id}")
        return AgentRead(**_serialize_agent(agent))

    async def delete_agent(self, agent_id: str):
        from app.core.qdrant_client import delete_collection
        agent = await self.repo.get_by_id(agent_id)
        if not agent:
            raise ValueError(f"Agent {agent_id} not found.")

        await self.repo.delete(agent)
        await cache_delete(f"agent:{agent_id}")
        await cache_delete_pattern(f"agent:list:*")

        # Clean up vector store
        try:
            await delete_collection(agent_id)
        except Exception as e:
            logger.warning(f"Could not delete Qdrant collection for {agent_id}: {e}")

        logger.info(f"Deleted agent: {agent_id}")
