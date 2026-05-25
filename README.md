# Multi-Agent AI Platform

A production-ready, full-stack multi-agent AI platform built with **Next.js 15**, **FastAPI**, **LangChain**, **LangGraph**, and a full database stack (PostgreSQL, MongoDB, Qdrant, Redis).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Nginx (Port 80)                         │
└──────────────┬─────────────────────────────┬────────────────────┘
               │                             │
    ┌──────────▼──────────┐      ┌───────────▼──────────┐
    │  Next.js 15 Frontend│      │  FastAPI Backend      │
    │  (Port 3000)        │      │  (Port 8000)          │
    │                     │      │                       │
    │  • Agent Dashboard  │ SSE  │  • Agent CRUD         │
    │  • Create Agent     │◄────►│  • Chat + Streaming   │
    │  • Chat Interface   │      │  • Upload + Embed     │
    │  • Zustand State    │      │  • LangGraph Agents   │
    └─────────────────────┘      └───────┬───────────────┘
                                         │
           ┌──────────────┬──────────────┼──────────────────┐
           │              │              │                   │
    ┌──────▼──────┐ ┌─────▼──────┐ ┌────▼────┐ ┌──────────▼──┐
    │ PostgreSQL  │ │  MongoDB   │ │  Redis  │ │   Qdrant     │
    │ (Port 5432) │ │ (Port 27017│ │(Port    │ │ (Port 6333)  │
    │             │ │            │ │ 6379)   │ │              │
    │ • agents    │ │ • sessions │ │ • cache │ │ • vectors    │
    │ • configs   │ │ • messages │ │ • queue │ │ • embeddings │
    └─────────────┘ └────────────┘ └─────────┘ └─────────────┘
```

---

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+
- Python 3.12+
- An OpenAI API key

### 1. Clone & Configure

```bash
git clone https://github.com/yourorg/multi-agent-platform
cd multi-agent-platform

cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### 2. Start with Docker Compose

```bash
docker-compose up --build -d
```

This starts all 8 services:
- **frontend** → http://localhost:3000
- **backend** → http://localhost:8000
- **postgres** → localhost:5432
- **mongo** → localhost:27017
- **redis** → localhost:6379
- **qdrant** → http://localhost:6333
- **ollama** → http://localhost:11434
- **nginx** → http://localhost:80

### 3. Open the Platform

Navigate to **http://localhost:3000** (or port 80 via Nginx).

---

## Local Development (without Docker)

### Backend

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy env
cp ../.env.example .env

# Start services (postgres, mongo, redis, qdrant) via Docker
docker-compose up postgres mongo redis qdrant -d

# Run database migrations
alembic upgrade head

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy env
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Start dev server
npm run dev
```

### Celery Worker (for background embedding jobs)

```bash
cd backend
celery -A app.workers.tasks.celery_app worker --loglevel=info -Q embeddings,cleanup
```

---

## Core Features

### Agent Dashboard
- Grid of agent cards with status badges
- Search by name, filter by status and pattern
- Activate / deactivate toggle
- Launch chat button (visible only when ACTIVE)
- Edit and delete with confirmation
- Pagination

### Create Agent (4-Step Wizard)
1. **Basic Info** — Name, description, execution pattern
2. **Data Source** — Features, interface type, API toggle
3. **Advanced Config** — System prompt, welcome message, LLM model, file upload
4. **Summary** — Review all settings before creation

### Chat Interface
- Per-agent isolated chat sessions
- Full message history with sidebar
- Streaming AI responses (SSE / Server-Sent Events)
- Markdown rendering with code highlighting
- File upload in chat
- Typing indicator during generation
- Auto-scroll to latest message

### RAG Pipeline
- Upload PDF, CSV, TXT, DOCX files
- Automatic chunking with overlap
- OpenAI embedding generation
- Qdrant vector storage per agent
- Similarity search injected into LLM context

### Multi-Agent Architecture (LangGraph)
```
User Query
  → Supervisor Agent (routes)
    ├── RAG Agent (vector search)
    ├── SQL Agent (structured queries)
    ├── Tool Agent (external APIs)
    └── Research Agent (complex reasoning)
  → Stream response to UI
```

---

## API Reference

### Agent Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/agents` | List agents (search, filter, paginate) |
| POST | `/api/v1/agents` | Create agent |
| GET | `/api/v1/agents/{id}` | Get agent |
| PUT | `/api/v1/agents/{id}` | Update agent |
| DELETE | `/api/v1/agents/{id}` | Delete agent |
| PATCH | `/api/v1/agents/{id}/activate` | Activate agent |
| PATCH | `/api/v1/agents/{id}/deactivate` | Deactivate agent |

### Chat Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/chat/session` | Create chat session |
| GET | `/api/v1/chat/history/{agent_id}` | Get session history |
| GET | `/api/v1/chat/messages/{session_id}` | Get messages |
| POST | `/api/v1/chat/message` | Send message (SSE streaming) |

### Upload Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/upload/file` | Upload a file |
| POST | `/api/v1/upload/embedding` | Generate embeddings |

### Dropdown Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/dropdowns/agent-patterns` | Agent pattern options |
| GET | `/api/v1/dropdowns/features` | Feature options |
| GET | `/api/v1/dropdowns/llm-models` | Available LLM models |
| GET | `/api/v1/dropdowns/user-interfaces` | UI type options |

Interactive docs available at: http://localhost:8000/api/docs

---

## Project Structure

```
multi-agent-platform/
├── docker-compose.yml
├── nginx/nginx.conf
├── .env.example
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   └── app/
│       ├── main.py                    # FastAPI app factory
│       ├── api/v1/
│       │   ├── router.py
│       │   └── endpoints/
│       │       ├── agents.py          # Agent CRUD
│       │       ├── chat.py            # SSE streaming chat
│       │       ├── upload.py          # File + embedding upload
│       │       └── dropdowns.py       # Config dropdowns
│       ├── core/
│       │   ├── config.py              # pydantic-settings
│       │   ├── database.py            # SQLAlchemy async
│       │   ├── mongodb.py             # Motor async
│       │   ├── redis_client.py        # aioredis
│       │   └── qdrant_client.py       # Qdrant async
│       ├── models/agent.py            # SQLAlchemy ORM models
│       ├── schemas/
│       │   ├── agent.py               # Pydantic schemas
│       │   └── chat.py
│       ├── repositories/
│       │   ├── agent_repository.py    # PostgreSQL CRUD
│       │   └── chat_repository.py     # MongoDB CRUD
│       ├── services/
│       │   ├── agent_service.py       # Business logic
│       │   ├── chat_service.py        # Streaming chat
│       │   └── embedding_service.py   # RAG pipeline
│       ├── agents/
│       │   └── graph.py               # LangGraph multi-agent
│       └── workers/
│           └── tasks.py               # Celery background tasks
│
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── next.config.mjs
    ├── tailwind.config.js
    └── src/
        ├── app/
        │   ├── layout.tsx             # Root layout + providers
        │   ├── page.tsx               # Redirect → /agents
        │   ├── globals.css
        │   ├── agents/
        │   │   ├── page.tsx           # Agent Dashboard
        │   │   ├── create/page.tsx    # 4-step Create Agent
        │   │   └── [id]/chat/page.tsx # Chat interface
        ├── features/agents/
        │   ├── AgentCard.tsx          # Agent card component
        │   ├── AgentCardSkeleton.tsx
        │   └── steps/                 # Stepper form steps
        ├── services/
        │   ├── apiClient.ts           # Axios + interceptors
        │   ├── agentService.ts        # Agent API calls
        │   └── chatService.ts         # Chat + SSE streaming
        ├── store/
        │   ├── agentStore.ts          # Zustand agent state
        │   └── chatStore.ts           # Zustand chat state
        ├── types/index.ts             # TypeScript interfaces
        ├── lib/utils.ts               # Utility functions
        └── components/shared/
            ├── Providers.tsx          # React Query provider
            ├── Sidebar.tsx            # Navigation sidebar
            └── EmptyState.tsx         # Empty state component
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, Shadcn UI |
| State | Zustand, TanStack Query |
| Animation | Framer Motion |
| Backend | FastAPI, Python 3.12 |
| AI Orchestration | LangChain, LangGraph |
| LLM | OpenAI GPT-4o, Ollama (local) |
| Embeddings | OpenAI text-embedding-3-small |
| Relational DB | PostgreSQL + SQLAlchemy 2.0 |
| Document DB | MongoDB + Motor |
| Vector DB | Qdrant |
| Cache / Queue | Redis + Celery |
| Infrastructure | Docker, Docker Compose, Nginx |

---

## Future Scope

- [ ] Authentication (JWT + refresh tokens)
- [ ] Voice Agents (WebRTC)
- [ ] WhatsApp / Slack integration
- [ ] Multi-user collaboration
- [ ] Analytics Dashboard
- [ ] Agent Marketplace
- [ ] Fine-tuning pipelines
- [ ] Agent versioning and rollback
