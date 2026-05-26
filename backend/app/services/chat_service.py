"""
Chat service: manages sessions, messages, and streaming AI responses.
"""

import re
from typing import AsyncGenerator, List, Optional
import structlog
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.chat_repository import ChatRepository
from app.schemas.chat import ChatSessionCreate, ChatSessionRead, MessageRead, ChatHistoryResponse
from app.agents.graph import stream_agent_response
from app.services.embedding_service import similarity_search

logger = structlog.get_logger()


class ChatService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.repo = ChatRepository(db)

    # ── Sessions ──────────────────────────────────────────────────────────────

    async def create_session(self, data: ChatSessionCreate) -> ChatSessionRead:
        session = await self.repo.create_session(data.agent_id, data.title)
        return ChatSessionRead(**session)

    async def get_history(self, agent_id: str) -> ChatHistoryResponse:
        sessions = await self.repo.list_sessions(agent_id)
        total = await self.repo.count_sessions(agent_id)
        return ChatHistoryResponse(
            sessions=[ChatSessionRead(**s) for s in sessions],
            total=total,
        )

    async def get_messages(self, session_id: str) -> List[MessageRead]:
        messages = await self.repo.get_messages(session_id)
        return [MessageRead(**m) for m in messages]

    # ── Streaming Chat ─────────────────────────────────────────────────────────

    # async def stream_chat(
    #     self,
    #     session_id: str,
    #     agent_id: str,
    #     pattern: str,
    #     user_message: str,
    #     llm_model: str = "llama3.1:8b",
    #     system_prompt: str = "",
    #     allow_rag: bool = True,
    # ) -> AsyncGenerator[str, None]:
    #     """
    #     Full chat pipeline with streaming:
    #     1. Save user message
    #     2. Retrieve RAG context (if enabled)
    #     3. Stream LLM response tokens
    #     4. Save assistant message
    #     """
    #     # 1. Persist user message
    #     await self.repo.add_message(session_id, "user", user_message)

    #     # 2. Retrieve conversation history for context window
    #     history = await self.repo.get_recent_messages(session_id, n=10)

    #     # 3. RAG context retrieval
    #     rag_context = ""
    #     if allow_rag and pattern in ("RAG", "MULTI_AGENT_RAG", "WORKFLOW_AGENT"):
    #         try:
    #             rag_context = await similarity_search(agent_id, user_message)
    #         except Exception as e:
    #             logger.warning(f"RAG retrieval failed: {e}")

    #     # 4. Stream response and accumulate for persistence
    #     full_response = ""
    #     try:
    #         async for chunk in stream_agent_response(
    #             agent_id=agent_id,
    #             session_id=session_id,
    #             pattern=pattern,
    #             user_message=user_message,
    #             history=history,
    #             context=rag_context,
    #             system_prompt=system_prompt,
    #         ):
    #             full_response += chunk
    #             yield chunk
    #     finally:
    #         # 5. Persist the complete assistant message
    #         if full_response:
    #             await self.repo.add_message(
    #                 session_id,
    #                 "assistant",
    #                 full_response,
    #                 metadata={"model": llm_model, "rag_used": bool(rag_context)},
    #             )


    @staticmethod
    def add_spaces(text: str) -> str:
        # Insert space before capital letters if missing
        return re.sub(r'(?<!\s)([A-Z])', r' \1', text)

    async def stream_chat(
        self,
        session_id: str,
        agent_id: str,
        pattern: str,
        user_message: str,
        llm_model: str = "llama3.1:8b",
        system_prompt: str = "",
        allow_rag: bool = True,
    ) -> AsyncGenerator[str, None]:

        # Save user message
        await self.repo.add_message(
            session_id,
            "user",
            user_message,
        )

        # Get recent history
        history = await self.repo.get_recent_messages(
            session_id,
            n=10,
        )

        # RAG context
        rag_context = ""

        if allow_rag and pattern in (
            "RAG",
            "MULTI_AGENT_RAG",
            "WORKFLOW_AGENT",
        ):
            try:
                rag_context = await similarity_search(
                    agent_id,
                    user_message,
                )

            except Exception as e:
                logger.warning(f"RAG retrieval failed: {e}")

        # Stream response
        full_response = ""

        try:

            async for chunk in stream_agent_response(
                agent_id=agent_id,
                session_id=session_id,
                pattern=pattern,
                user_message=user_message,
                history=history,
                context=rag_context,
                system_prompt=system_prompt,
            ):

                # convert chunk to text
                text = chunk.content if hasattr(chunk, "content") else str(chunk)

                if not text:
                    continue

                # save full response
                full_response += text

                # send to frontend
                formatted_text = self.add_spaces(text)
                yield formatted_text
                # yield text + ""

        except Exception as e:

            logger.exception("Streaming error")

            yield f"\nError: {str(e)}"

        finally:

            # Save assistant message
            if full_response.strip():

                await self.repo.add_message(
                    session_id,
                    "assistant",
                    full_response,
                    metadata={
                        "model": llm_model,
                        "rag_used": bool(rag_context),
                    },
                )