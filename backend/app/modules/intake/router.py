"""Incoming-data approval queue: GET the pending items, then approve or reject them one by one or all at once."""
import uuid
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.ratelimit import limit
from app.db.models.profile import StudentProfile
from app.db.session import get_db
from app.modules.coding.router import get_github_fetcher, get_platform_fetcher
from app.modules.intake import service
from app.modules.profile import schemas as profile_schemas
from app.modules.profile import service as profile_service
from app.modules.profile.router import current_profile

router = APIRouter(prefix="/intake", tags=["intake"])


@router.get("")
def pending(profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)) -> dict[str, Any]:
    requests = [service.request_out(r) for r in service.pending_requests(db, profile)]
    proposals = [profile_schemas.ProposalOut.model_validate(p).model_dump(mode="json") for p in profile_service.list_proposals(db, profile)]
    return {"requests": requests, "proposals": proposals, "total": len(requests) + len(proposals)}


@router.post("/approve-all", dependencies=[Depends(limit("intake", 20, 3600))])
def approve_all(
    profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db),
    github_fetch=Depends(get_github_fetcher), platform_fetch=Depends(get_platform_fetcher),
) -> dict[str, Any]:
    return service.approve_all(db, profile, github_fetch, platform_fetch)


@router.post("/reject-all")
def reject_all(profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)) -> dict[str, Any]:
    return service.reject_all(db, profile)


@router.post("/requests/{request_id}/approve", dependencies=[Depends(limit("intake", 60, 3600))])
def approve_one(
    request_id: uuid.UUID, profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db),
    github_fetch=Depends(get_github_fetcher), platform_fetch=Depends(get_platform_fetcher),
) -> dict[str, Any]:
    r = service.approve_request(db, profile, service._get(db, profile, request_id), github_fetch, platform_fetch)
    return service.request_out(r)


@router.post("/requests/{request_id}/reject")
def reject_one(request_id: uuid.UUID, profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)) -> dict[str, Any]:
    return service.request_out(service.reject_request(db, profile, service._get(db, profile, request_id)))
