import uuid
from typing import Any, Literal

from fastapi import APIRouter, Body, Depends, Response
from sqlalchemy.orm import Session

from app.core.security import AuthUser, get_current_user
from app.db.models.profile import StudentProfile
from app.db.session import get_db
from app.modules.profile import schemas, service

router = APIRouter(tags=["profile"])

Section = Literal["education", "experience", "achievements", "skills", "projects"]


def current_profile(
    auth: AuthUser = Depends(get_current_user), db: Session = Depends(get_db)
) -> StudentProfile:
    return service.ensure_profile(db, auth)


@router.get("/me")
def read_me(
    auth: AuthUser = Depends(get_current_user),
    profile: StudentProfile = Depends(current_profile),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    return {
        "id": auth.id,
        "email": auth.email,
        "profile": schemas.ProfileOut.model_validate(profile),
        "completeness": service.completeness(db, profile),
    }


@router.patch("/profile", response_model=schemas.ProfileOut)
def patch_profile(
    body: schemas.ProfileUpdate,
    profile: StudentProfile = Depends(current_profile),
    db: Session = Depends(get_db),
):
    return service.update_profile(db, profile, body)


# Declared before /profile/{section} so "proposals" is never read as a section.
@router.get("/profile/proposals", response_model=list[schemas.ProposalOut])
def get_proposals(
    profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)
):
    return service.list_proposals(db, profile)


@router.post(
    "/profile/proposals/{proposal_id}/approve", response_model=schemas.ProposalOut
)
def approve(
    proposal_id: uuid.UUID,
    profile: StudentProfile = Depends(current_profile),
    db: Session = Depends(get_db),
):
    return service.approve_proposal(db, profile, proposal_id)


@router.post(
    "/profile/proposals/{proposal_id}/reject", response_model=schemas.ProposalOut
)
def reject(
    proposal_id: uuid.UUID,
    profile: StudentProfile = Depends(current_profile),
    db: Session = Depends(get_db),
):
    return service.reject_proposal(db, profile, proposal_id)


@router.get("/profile/{section}")
def list_section(
    section: Section,
    profile: StudentProfile = Depends(current_profile),
    db: Session = Depends(get_db),
):
    return [service.serialize(r) for r in service.list_items(db, profile, section)]


@router.post("/profile/{section}", status_code=201)
def create_section_item(
    section: Section,
    body: dict[str, Any] = Body(...),
    profile: StudentProfile = Depends(current_profile),
    db: Session = Depends(get_db),
):
    return service.serialize(service.create_item(db, profile, section, body))


@router.patch("/profile/{section}/{item_id}")
def update_section_item(
    section: Section,
    item_id: uuid.UUID,
    body: dict[str, Any] = Body(...),
    profile: StudentProfile = Depends(current_profile),
    db: Session = Depends(get_db),
):
    return service.serialize(service.update_item(db, profile, section, item_id, body))


@router.delete("/profile/{section}/{item_id}", status_code=204)
def delete_section_item(
    section: Section,
    item_id: uuid.UUID,
    profile: StudentProfile = Depends(current_profile),
    db: Session = Depends(get_db),
):
    service.delete_item(db, profile, section, item_id)
    return Response(status_code=204)
