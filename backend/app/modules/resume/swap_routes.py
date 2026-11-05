"""Phase 4 endpoints: JD-aware GitHub project swap suggestions for a tailored resume draft."""
import uuid
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.core.ratelimit import limit
from app.db.models.profile import StudentProfile
from app.db.session import get_db
from app.modules.profile.router import current_profile
from app.modules.resume import swap
from app.modules.resume.versions import _get, version_out

router = APIRouter(prefix="/resume/versions", tags=["resume"])


@router.get("/{version_id}/swap-suggestions")
def swap_suggestions(version_id: uuid.UUID, profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)) -> dict[str, Any]:
    v = _get(db, profile, version_id)
    return {"suggestions": swap.suggest(db, profile, v) if v.status == "DRAFT" else []}


class SwapIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    repo_id: uuid.UUID
    replace_project_id: str


@router.post("/{version_id}/swaps", dependencies=[Depends(limit("swap", 30, 3600))])
def apply_swap(version_id: uuid.UUID, body: SwapIn, profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)) -> dict[str, Any]:
    v = _get(db, profile, version_id)
    result = swap.apply(db, profile, v, body.repo_id, body.replace_project_id)
    return {**version_out(v, profile), **result}
