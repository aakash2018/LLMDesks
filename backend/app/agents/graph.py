"""
LangGraph multi-agent orchestration.
Supervisor → routes to specialized agents → streams response to UI.
"""

from __future__ import annotations

import json
from typing import AsyncGenerator, Literal, TypedDict, Annotated, List

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
import structlog

from app.core.config import settings

logger = structlog.get_logger()


# ─── State ────────────────────────────────────────────────────────────────────

class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]
    agent_id: str
    session_id: str
    pattern: str
    next_agent: str
    context: str          # RAG context injected before final answer
    iterations: int       # guard against infinite loops


# ─── LLM Factory ─────────────────────────────────────────────────────────────

def get_llm(model: str = settings.OPENAI_DEFAULT_MODEL, streaming: bool = True) -> ChatOpenAI:
    return ChatOpenAI(
        model=model,
        streaming=streaming,
        temperature=0.1,
        api_key=settings.OPENAI_API_KEY,
    )


# ─── Supervisor Agent ─────────────────────────────────────────────────────────

SUPERVISOR_PROMPT = """You are a supervisor agent that routes user queries to the best specialist.

Available specialists:
- rag_agent      → searches document knowledge base, answers factual questions
- sql_agent      → queries structured databases, generates SQL, runs analytics
- tool_agent     → calls external APIs, performs web actions, uses tools
- research_agent → breaks down complex multi-step research tasks

Analyse the user's last message and respond ONLY with a JSON object:
{{"next": "<specialist_name>"}}

No other text.
"""


async def supervisor_node(state: AgentState) -> AgentState:
    """Route the query to the most appropriate specialist."""
    llm = get_llm(streaming=False)
    messages = [SystemMessage(content=SUPERVISOR_PROMPT)] + state["messages"]

    response = await llm.ainvoke(messages)
    try:
        data = json.loads(response.content.strip())
        next_agent = data.get("next", "rag_agent")
    except (json.JSONDecodeError, AttributeError):
        next_agent = "rag_agent"

    valid = {"rag_agent", "sql_agent", "tool_agent", "research_agent"}
    if next_agent not in valid:
        next_agent = "rag_agent"

    logger.info(f"Supervisor routing to: {next_agent}")
    return {**state, "next_agent": next_agent, "iterations": state.get("iterations", 0) + 1}


def supervisor_router(state: AgentState) -> Literal["rag_agent", "sql_agent", "tool_agent", "research_agent"]:
    return state["next_agent"]


# ─── RAG Agent ────────────────────────────────────────────────────────────────

async def rag_agent_node(state: AgentState) -> AgentState:
    """Answers questions using vector search over uploaded documents."""
    system = f"""You are a precise RAG assistant. Use the following retrieved context to answer the question.
If the answer is not in the context, say so honestly.

Context:
{state.get('context', 'No context retrieved.')}
"""
    llm = get_llm()
    messages = [SystemMessage(content=system)] + state["messages"]
    response = await llm.ainvoke(messages)
    return {**state, "messages": [response]}


# ─── SQL Agent ────────────────────────────────────────────────────────────────

SQL_AGENT_PROMPT = """You are a SQL expert assistant. When the user asks about data:
1. Generate accurate SQL queries
2. Explain what the query does
3. Format results clearly

Always use safe, read-only queries unless explicitly told otherwise.
"""


async def sql_agent_node(state: AgentState) -> AgentState:
    llm = get_llm()
    messages = [SystemMessage(content=SQL_AGENT_PROMPT)] + state["messages"]
    response = await llm.ainvoke(messages)
    return {**state, "messages": [response]}


# ─── Tool Calling Agent ───────────────────────────────────────────────────────

TOOL_AGENT_PROMPT = """You are an assistant that can use external tools and APIs.
Describe what you would do with the available tools to answer the user's request.
Be specific about which APIs, endpoints, or services you would call.
"""


async def tool_agent_node(state: AgentState) -> AgentState:
    llm = get_llm()
    messages = [SystemMessage(content=TOOL_AGENT_PROMPT)] + state["messages"]
    response = await llm.ainvoke(messages)
    return {**state, "messages": [response]}


# ─── Research Agent ───────────────────────────────────────────────────────────

RESEARCH_AGENT_PROMPT = """You are a thorough research assistant. For complex questions:
1. Break the problem into sub-questions
2. Address each sub-question systematically
3. Synthesize a comprehensive answer
4. Cite your reasoning clearly
"""


async def research_agent_node(state: AgentState) -> AgentState:
    llm = get_llm()
    messages = [SystemMessage(content=RESEARCH_AGENT_PROMPT)] + state["messages"]
    response = await llm.ainvoke(messages)
    return {**state, "messages": [response]}


# ─── Graph Builder ────────────────────────────────────────────────────────────

def build_multi_agent_graph() -> StateGraph:
    """Build the LangGraph multi-agent workflow."""
    graph = StateGraph(AgentState)

    # Add nodes
    graph.add_node("supervisor", supervisor_node)
    graph.add_node("rag_agent", rag_agent_node)
    graph.add_node("sql_agent", sql_agent_node)
    graph.add_node("tool_agent", tool_agent_node)
    graph.add_node("research_agent", research_agent_node)

    # Entry point → supervisor
    graph.set_entry_point("supervisor")

    # Conditional routing from supervisor
    graph.add_conditional_edges(
        "supervisor",
        supervisor_router,
        {
            "rag_agent": "rag_agent",
            "sql_agent": "sql_agent",
            "tool_agent": "tool_agent",
            "research_agent": "research_agent",
        },
    )

    # All specialist agents → END
    graph.add_edge("rag_agent", END)
    graph.add_edge("sql_agent", END)
    graph.add_edge("tool_agent", END)
    graph.add_edge("research_agent", END)

    return graph.compile()


# ─── RAG-only Graph (simpler pattern) ────────────────────────────────────────

def build_rag_graph() -> StateGraph:
    """Simple RAG graph without supervisor routing."""
    graph = StateGraph(AgentState)
    graph.add_node("rag_agent", rag_agent_node)
    graph.set_entry_point("rag_agent")
    graph.add_edge("rag_agent", END)
    return graph.compile()


# ─── Graph Registry ───────────────────────────────────────────────────────────

_GRAPH_CACHE: dict = {}


def get_graph_for_pattern(pattern: str):
    """Return the compiled LangGraph for the given agent pattern."""
    if pattern in _GRAPH_CACHE:
        return _GRAPH_CACHE[pattern]

    if pattern == "MULTI_AGENT_RAG":
        graph = build_multi_agent_graph()
    elif pattern == "WORKFLOW_AGENT":
        graph = build_multi_agent_graph()
    else:
        # RAG, SQL_AGENT, TOOL_CALLING_AGENT all use simple RAG-style flow
        graph = build_rag_graph()

    _GRAPH_CACHE[pattern] = graph
    return graph


# ─── Streaming Runner ─────────────────────────────────────────────────────────

async def stream_agent_response(
    agent_id: str,
    session_id: str,
    pattern: str,
    user_message: str,
    history: List[dict],
    context: str = "",
    system_prompt: str = "",
) -> AsyncGenerator[str, None]:
    """
    Stream tokens from the agent graph for the given user message.
    Yields string chunks as they arrive.
    """
    graph = get_graph_for_pattern(pattern)

    # Build message history for LangChain
    lc_messages: List[BaseMessage] = []

    if system_prompt:
        lc_messages.append(SystemMessage(content=system_prompt))

    for msg in history[-10:]:  # Last 10 messages for context window
        if msg["role"] == "user":
            lc_messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            lc_messages.append(AIMessage(content=msg["content"]))

    lc_messages.append(HumanMessage(content=user_message))

    initial_state: AgentState = {
        "messages": lc_messages,
        "agent_id": agent_id,
        "session_id": session_id,
        "pattern": pattern,
        "next_agent": "rag_agent",
        "context": context,
        "iterations": 0,
    }

    # Stream events from the graph
    async for event in graph.astream_events(initial_state, version="v2"):
        kind = event.get("event")
        if kind == "on_chat_model_stream":
            chunk = event.get("data", {}).get("chunk")
            if chunk and hasattr(chunk, "content") and chunk.content:
                yield chunk.content
