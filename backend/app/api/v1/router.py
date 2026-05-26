"""
API v1 router: combines all endpoint modules.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import agents, chat, upload, dropdowns

api_router = APIRouter()

api_router.include_router(agents.router)
api_router.include_router(chat.router)
api_router.include_router(upload.router)
api_router.include_router(dropdowns.router)
