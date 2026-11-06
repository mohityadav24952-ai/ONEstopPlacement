"""Data export and account deletion (Blueprint 11.6, 12.2)."""
from typing import Any

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.ratelimit import limit
from app.db.models.feedback import Feedback
from app.db.models.portfolio import PortfolioVersion
from app.db.models.profile import StudentProfile, User
from app.db.models.resume import ResumeDocument, ResumeVersion
from app.db.session import get_db
from app.modules.coding import service as coding_service
from app.modules.profile import service as profile_service
from app.modules.profile.router import current_profile
from app.shared.storage import Storage, get_storage

router = APIRouter(tags=["account"])


@router.post("/me/export", dependencies=[Depends(limit("export", 5, 3600))])
def export_my_data(profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)) -> dict[str, Any]:
    """Everything the user entered, as JSON. Raw uploaded files are not included."""
    return {
        "profile": {k: getattr(profile, k) for k in ("display_name", "headline", "target_roles", "graduation_year", "location_pref", "summary")},
        "sections": {s: [profile_service.serialize(r) for r in profile_service.list_items(db, profile, s)] for s in profile_service.SECTIONS},
        "coding": coding_service.dashboard(db, profile),
        "resume_versions": [{"title": v.title, "status": v.status, "content": v.content}
                            for v in db.scalars(select(ResumeVersion).where(ResumeVersion.profile_id == profile.id))],
        "portfolio_versions": [{"status": v.status, "theme": v.theme_id, "content": v.content}
                               for v in db.scalars(select(PortfolioVersion).where(PortfolioVersion.profile_id == profile.id))],
        "feedback": [{"kind": f.kind, "text": f.feedback_text, "sent_at": f.created_at.isoformat()}
                     for f in db.scalars(select(Feedback).where(Feedback.profile_id == profile.id))],
    }


class DeleteIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    confirm: str


@router.delete("/me", status_code=204)
def delete_account(body: DeleteIn, profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db),
                   storage: Storage = Depends(get_storage)):
    """Deletes stored files first, then every user-owned row through FK cascades."""
    if body.confirm != "DELETE MY ACCOUNT":
        raise AppError("CONFIRMATION_REQUIRED", 'Type "DELETE MY ACCOUNT" to confirm.', 422)
    for doc in db.scalars(select(ResumeDocument).where(ResumeDocument.profile_id == profile.id)):
        storage.delete(doc.storage_key)
        storage.delete(doc.text_storage_key)
    for v in db.scalars(select(ResumeVersion).where(ResumeVersion.profile_id == profile.id)):
        if v.pdf_storage_key:
            storage.delete(v.pdf_storage_key)
    for v in db.scalars(select(PortfolioVersion).where(PortfolioVersion.profile_id == profile.id)):
        if v.export_storage_key:
            storage.delete(v.export_storage_key)
    user = db.get(User, profile.user_id)
    db.delete(user)
    db.commit()
    return Response(status_code=204)
