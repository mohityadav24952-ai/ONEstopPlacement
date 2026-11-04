from fastapi import APIRouter

from app.modules.coding.router import router as coding_router
from app.modules.resume.documents import router as resume_documents_router
from app.modules.resume.jd import router as jd_router
from app.modules.resume.versions import router as versions_router
from app.modules.profile.router import router as profile_router

# Every product endpoint lives under /api/v1.
router = APIRouter(prefix="/api/v1")
router.include_router(profile_router)
router.include_router(coding_router)
router.include_router(resume_documents_router)
router.include_router(jd_router)
router.include_router(versions_router)
