"""
Dropdown configuration endpoints for dynamic form fields.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/dropdowns", tags=["Dropdowns"])


class DropdownOption(BaseModel):
    value: str
    label: str
    description: str | None = None


@router.get("/agent-patterns", response_model=List[DropdownOption])
async def get_agent_patterns():
    """Available agent execution patterns."""
    return [
        DropdownOption(value="RAG", label="RAG Agent", description="Retrieval-Augmented Generation over documents"),
        DropdownOption(value="SQL_AGENT", label="SQL Agent", description="Natural language to SQL query execution"),
        DropdownOption(value="MULTI_AGENT_RAG", label="Multi-Agent RAG", description="Supervisor + specialist agent workflow"),
        DropdownOption(value="WORKFLOW_AGENT", label="Workflow Agent", description="Custom LangGraph workflow orchestration"),
        DropdownOption(value="TOOL_CALLING_AGENT", label="Tool Calling Agent", description="Connects to external APIs and tools"),
    ]


@router.get("/features", response_model=List[DropdownOption])
async def get_features():
    """Available agent feature flags."""
    return [
        DropdownOption(value="web_search", label="Web Search", description="Search the web for current information"),
        DropdownOption(value="code_execution", label="Code Execution", description="Execute Python code"),
        DropdownOption(value="file_analysis", label="File Analysis", description="Analyse uploaded files"),
        DropdownOption(value="data_visualization", label="Data Visualisation", description="Generate charts and graphs"),
        DropdownOption(value="email_integration", label="Email Integration", description="Read and send emails"),
        DropdownOption(value="calendar_integration", label="Calendar Integration", description="Manage calendar events"),
        DropdownOption(value="database_query", label="Database Query", description="Execute database queries"),
        DropdownOption(value="api_calling", label="API Calling", description="Call external REST APIs"),
    ]


@router.get("/llm-models", response_model=List[DropdownOption])
async def get_llm_models():
    """Available LLM models."""
    return [
        # OpenAI
        DropdownOption(value="gpt-4o", label="GPT-4o", description="Most capable OpenAI model"),
        DropdownOption(value="gpt-4o-mini", label="GPT-4o Mini", description="Fast and cost-efficient"),
        DropdownOption(value="gpt-4-turbo", label="GPT-4 Turbo", description="High capability, large context"),
        DropdownOption(value="gpt-3.5-turbo", label="GPT-3.5 Turbo", description="Fastest, most economical"),
        # Ollama (local)
        DropdownOption(value="ollama/llama3.2", label="Llama 3.2 (Local)", description="Meta's open-source model via Ollama"),
        DropdownOption(value="ollama/mistral", label="Mistral 7B (Local)", description="Efficient open-source model"),
        DropdownOption(value="ollama/codellama", label="Code Llama (Local)", description="Optimised for code generation"),
        DropdownOption(value="ollama/gemma2", label="Gemma 2 (Local)", description="Google's open model via Ollama"),
    ]


@router.get("/user-interfaces", response_model=List[DropdownOption])
async def get_user_interfaces():
    """Available user interface options."""
    return [
        DropdownOption(value="chat", label="Chat Interface", description="Standard conversational chat UI"),
        DropdownOption(value="form", label="Form Interface", description="Structured form-based input"),
        DropdownOption(value="dashboard", label="Dashboard", description="Analytics and reporting view"),
        DropdownOption(value="embedded", label="Embedded Widget", description="Embeddable chat widget"),
    ]
