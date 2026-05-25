"""
Chat API endpoints with Server-Sent Events for streaming responses.
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.mongodb import get_mongo
from app.core.database import get_db
from app.schemas.chat import ChatSessionCreate, ChatSessionRead, MessageCreate, MessageRead, ChatHistoryResponse
from app.services.chat_service import ChatService
from app.services.agent_service import AgentService
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/chat", tags=["Chat"])


def get_chat_service(db: AsyncIOMotorDatabase = Depends(get_mongo)) -> ChatService:
    return ChatService(db)


def get_agent_service(db: AsyncSession = Depends(get_db)) -> AgentService:
    return AgentService(db)


@router.post("/session", response_model=ChatSessionRead)
async def create_session(
    data: ChatSessionCreate,
    chat_svc: ChatService = Depends(get_chat_service),
    agent_svc: AgentService = Depends(get_agent_service),
):
    """Create a new chat session for an agent."""
    agent = await agent_svc.get_agent(data.agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if agent.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Agent is not active. Activate it first.")
    return await chat_svc.create_session(data)


@router.get("/history/{agent_id}", response_model=ChatHistoryResponse)
async def get_history(
    agent_id: str,
    chat_svc: ChatService = Depends(get_chat_service),
):
    """Get all chat sessions for an agent."""
    return await chat_svc.get_history(agent_id)


@router.get("/messages/{session_id}", response_model=list[MessageRead])
async def get_messages(
    session_id: str,
    chat_svc: ChatService = Depends(get_chat_service),
):
    """Get all messages in a chat session."""
    return await chat_svc.get_messages(session_id)


@router.post("/message")
async def send_message(
    data: MessageCreate,
    chat_svc: ChatService = Depends(get_chat_service),
    agent_svc: AgentService = Depends(get_agent_service),
):
    """
    Send a message and receive a streaming SSE response.
    The response is streamed as Server-Sent Events (text/event-stream).
    """
    # Verify session exists
    session = await chat_svc.repo.get_session(data.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    agent = await agent_svc.get_agent(session["agent_id"])
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Extract agent config
    pattern = agent.pattern
    llm_model = "gpt-4o-mini"
    system_prompt = ""
    allow_file_upload = True

    if agent.config:
        llm_model = agent.config.llm_model or llm_model
        system_prompt = agent.config.prompt or ""
        allow_file_upload = agent.config.allow_file_upload

    async def event_generator():
        """Yield SSE-formatted chunks."""
        try:
            async for chunk in chat_svc.stream_chat(
                session_id=data.session_id,
                agent_id=agent.id,
                pattern=pattern,
                user_message=data.content,
                llm_model=llm_model,
                system_prompt=system_prompt,
                allow_rag=True,
            ):
                # SSE format: "data: <content>\n\n"
                safe_chunk = chunk.replace("\n", "\\n")
                yield f"data: {safe_chunk}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",       # Disable Nginx buffering
            "Connection": "keep-alive",
        },
    )
