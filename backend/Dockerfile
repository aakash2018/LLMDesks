FROM python:3.11-slim

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip + install build tools
RUN pip install --upgrade pip setuptools wheel

# Copy and install requirements
COPY requirements.txt .

# Install in two steps — first core, then AI packages
# This gives clearer error messages if something fails
RUN pip install --no-cache-dir \
    fastapi \
    uvicorn[standard] \
    python-multipart \
    httpx \
    sqlalchemy[asyncio] \
    asyncpg \
    alembic \
    motor \
    "redis[hiredis]" \
    qdrant-client \
    pypdf \
    python-docx \
    pandas \
    openpyxl \
    pydantic \
    pydantic-settings \
    email-validator \
    "python-jose[cryptography]" \
    "passlib[bcrypt]" \
    "celery[redis]" \
    flower \
    python-dotenv \
    aiofiles \
    tenacity \
    structlog \
    prometheus-fastapi-instrumentator

RUN pip install --no-cache-dir \
    openai \
    tiktoken \
    langchain \
    langchain-core \
    langchain-openai \
    langchain-community \
    langchain-qdrant \
    langgraph \
    ollama

COPY . .

RUN mkdir -p /app/uploads

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]