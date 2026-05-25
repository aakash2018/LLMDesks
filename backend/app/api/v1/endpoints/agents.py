"""
Agent CRUD API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.agent import AgentCreate, AgentUpdate, AgentRead, AgentListResponse, AgentFilter
from app.services.agent_service import AgentService

router = APIRouter(prefix="/agents", tags=["Agents"])


def get_service(db: AsyncSession = Depends(get_db)) -> AgentService:
    return AgentService(db)


@router.get("", response_model=AgentListResponse)
async def list_agents(
    search: str | None = Query(None, description="Search by name or description"),
    status: str | None = Query(None, description="Filter by status"),
    pattern: str | None = Query(None, description="Filter by pattern"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    service: AgentService = Depends(get_service),
):
    """List all agents with optional search and pagination."""
    filters = AgentFilter(search=search, status=status, pattern=pattern, page=page, page_size=page_size)
    return await service.list_agents(filters)


@router.post("", response_model=AgentRead, status_code=status.HTTP_201_CREATED)
async def create_agent(
    data: AgentCreate,
    service: AgentService = Depends(get_service),
):
    """Create a new agent."""
    try:
        return await service.create_agent(data)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.get("/{agent_id}", response_model=AgentRead)
async def get_agent(
    agent_id: str,
    service: AgentService = Depends(get_service),
):
    """Get a single agent by ID."""
    agent = await service.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.put("/{agent_id}", response_model=AgentRead)
async def update_agent(
    agent_id: str,
    data: AgentUpdate,
    service: AgentService = Depends(get_service),
):
    """Update an agent's configuration."""
    try:
        return await service.update_agent(agent_id, data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent(
    agent_id: str,
    service: AgentService = Depends(get_service),
):
    """Delete an agent and its associated resources."""
    try:
        await service.delete_agent(agent_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch("/{agent_id}/activate", response_model=AgentRead)
async def activate_agent(
    agent_id: str,
    service: AgentService = Depends(get_service),
):
    """Activate an agent, making it available for chat."""
    try:
        return await service.activate_agent(agent_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch("/{agent_id}/deactivate", response_model=AgentRead)
async def deactivate_agent(
    agent_id: str,
    service: AgentService = Depends(get_service),
):
    """Deactivate an agent."""
    try:
        return await service.deactivate_agent(agent_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
