"""Regenerate the AI summary of a draft resume version (the first one is made when the version is created)."""
import copy
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.ai.llm import LLMClient, get_llm_client
from app.core.ratelimit import limit
from app.db.models.profile import StudentProfile
from app.db.models.resume import ResumeAnalysis
from app.db.session import get_db
from app.modules.profile.router import current_profile
from app.modules.resume import summary as summary_mod
from app.modules.resume.jd import get_jd
from app.modules.resume.versions import _draft, _get, version_out

router = APIRouter(prefix="/resume/versions", tags=["resume"])


@router.post("/{version_id}/summary", dependencies=[Depends(limit("ai", 20, 60))])
def regenerate_summary(
    version_id: uuid.UUID, profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db),
    llm: LLMClient = Depends(get_llm_client),
):
    """Writes a fresh summary for the version's target job (or a general one if it has none). Drafts only:
    the user can then still edit the text by hand."""
    v = _draft(_get(db, profile, version_id))
    role = company = None
    requirements: list[str] = []
    if v.jd_id:
        jd = get_jd(db, profile, v.jd_id)
        role, company = jd.role_title, jd.company
    if v.analysis_id:
        analysis = db.get(ResumeAnalysis, v.analysis_id)
        if analysis is not None:
            requirements = [r["text"] for r in analysis.requirements]
    content = copy.deepcopy(v.content)
    content["summary"] = {**content.get("summary", {}), **summary_mod.build_summary(
        db, profile, llm, content, role=role, company=company, requirements=requirements)}
    v.content = content  # reassign so the JSON change is persisted
    db.commit()
    return version_out(v, profile)
