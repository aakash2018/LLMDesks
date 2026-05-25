"""
Application configuration using pydantic-settings.
All values can be overridden via environment variables.
"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyUrl, field_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
        enable_decoding=False,
    )

    # ── App ──
    APP_NAME: str = "Multi-Agent AI Platform"
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "change-me-in-production"
    DEBUG: bool = True

    # ── CORS ──
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:80",
        "http://127.0.0.1:3000",
    ]

    # ── PostgreSQL ──
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/multiagent"

    # ── MongoDB ──
    MONGODB_URL: str = "mongodb://localhost:27017/multiagent"
    MONGODB_DB_NAME: str = "multiagent"

    # ── Redis ──
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── Qdrant ──
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_COLLECTION_PREFIX: str = "agent_"

    # ── Ollama ──
    OLLAMA_URL: str = "http://localhost:11434"

    # ── OpenAI ──
    OPENAI_API_KEY: str = ""
    OPENAI_DEFAULT_MODEL: str = "gpt-4o-mini"

    # ── Embeddings ──
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSION: int = 1536
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200

    # ── Upload ──
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 100
    ALLOWED_EXTENSIONS: List[str] = [".pdf", ".csv", ".txt", ".docx"]

    # ── Pagination ──
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, v):
        if isinstance(v, str):
            normalized = v.strip().lower()
            if normalized in {"false", "0", "no", "off", "release", "production"}:
                return False
            if normalized in {"true", "1", "yes", "on", "debug", "development"}:
                return True
        return v

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v


settings = Settings()
