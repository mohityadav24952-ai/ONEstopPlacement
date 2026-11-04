from fastapi import APIRouter

from app.modules.coding.router import router as coding_router
from app.modules.profile.router import router as profile_router

# Every product endpoint lives under /api/v1.
router = APIRouter(prefix="/api/v1")
router.include_router(profile_router)
router.include_router(coding_router)
