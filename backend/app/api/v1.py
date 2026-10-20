from fastapi import APIRouter

from app.api import me

# Every product endpoint lives under /api/v1.
router = APIRouter(prefix="/api/v1")
router.include_router(me.router)