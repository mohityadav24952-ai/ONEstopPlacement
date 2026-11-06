from fastapi import APIRouter

from app.modules.coding.router import router as coding_router
from app.modules.feedback.router import router as feedback_router
from app.modules.intake.router import router as intake_router
from app.modules.resume.summary_routes import router as summary_router
from app.modules.resume.swap_routes import router as swap_router
from app.modules.resume.documents import router as resume_documents_router
from app.modules.resume.jd import router as jd_router
from app.modules.resume.versions import router as versions_router
from app.modules.resume.template_routes import router as resume_templates_router
from app.modules.interview.router import router as interview_router
from app.modules.portfolio.router import router as portfolio_router
from app.modules.home.account import router as account_router
from app.modules.home.router import router as home_router
from app.modules.profile.router import router as profile_router
from app.modules.site_builder.router import router as site_builder_router

# Every product endpoint lives under /api/v1.
router = APIRouter(prefix="/api/v1")
router.include_router(profile_router)
router.include_router(coding_router)
router.include_router(resume_documents_router)
router.include_router(jd_router)
router.include_router(versions_router)
router.include_router(resume_templates_router)
router.include_router(interview_router)
router.include_router(portfolio_router)
router.include_router(home_router)
router.include_router(account_router)
router.include_router(site_builder_router)
router.include_router(intake_router)
router.include_router(swap_router)
router.include_router(summary_router)
router.include_router(feedback_router)
