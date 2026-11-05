"""Profile service: all reads and writes are scoped to the owning profile."""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.security import AuthUser
from app.db.models.profile import (
    Achievement,
    Education,
    Experience,
    Project,
    Proposal,
    Skill,
    StudentProfile,
    User,
)
from app.modules.profile import schemas

SECTIONS: dict[str, tuple[type, type[schemas._Strict]]] = {
    "education": (Education, schemas.EducationIn),
    "experience": (Experience, schemas.ExperienceIn),
    "achievements": (Achievement, schemas.AchievementIn),
    "skills": (Skill, schemas.SkillIn),
    "projects": (Project, schemas.ProjectIn),
}

_SYSTEM_COLUMNS = {
    "id",
    "profile_id",
    "created_at",
    "updated_at",
    "source_type",
    "verification_state",
    "normalized_name",
    "repository_id",
}


def _not_found() -> AppError:
    # Same response whether the row does not exist or belongs to someone else.
    return AppError("NOT_FOUND", "That item was not found.", 404)


def ensure_profile(db: Session, auth: AuthUser) -> StudentProfile:
    """Return the caller's profile, creating the user and profile on first sign-in."""
    user = db.scalar(select(User).where(User.auth_subject == auth.id))
    if user is None:
        user = User(auth_subject=auth.id, email=auth.email)
        user.profile = StudentProfile(target_roles=[])
        db.add(user)
        try:
            db.commit()
        except IntegrityError:  # two first requests raced
            db.rollback()
            user = db.scalar(select(User).where(User.auth_subject == auth.id))
            assert user is not None
    else:
        now = datetime.now(timezone.utc)
        stale = user.last_login is None or (now - user.last_login.replace(tzinfo=user.last_login.tzinfo or timezone.utc)) > timedelta(hours=1)
        if stale or (auth.email and user.email != auth.email):
            user.last_login = now
            if auth.email:
                user.email = auth.email
            db.commit()
    return user.profile


def _bump(profile: StudentProfile) -> None:
    profile.version += 1
    profile.updated_at = datetime.now(timezone.utc)


def serialize(row: Any) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for col in row.__table__.columns:
        if col.name in ("profile_id", "normalized_name"):
            continue
        value = getattr(row, col.name)
        if isinstance(value, uuid.UUID):
            value = str(value)
        elif hasattr(value, "isoformat"):
            value = value.isoformat()
        out[col.name] = value
    return out


def update_profile(
    db: Session, profile: StudentProfile, body: schemas.ProfileUpdate
) -> StudentProfile:
    if body.expected_version != profile.version:
        raise AppError(
            "VERSION_CONFLICT",
            "Your profile changed elsewhere. Reload and try again.",
            409,
            {"current_version": profile.version},
        )
    changes = body.model_dump(exclude_unset=True, exclude={"expected_version"})
    for key, value in changes.items():
        if key == "target_roles":
            value = [v.strip() for v in (value or []) if v.strip()]
        elif isinstance(value, str):
            value = value.strip() or None
        setattr(profile, key, value)
    _bump(profile)
    db.commit()
    return profile


def _spec(section: str) -> tuple[type, type[schemas._Strict]]:
    try:
        return SECTIONS[section]
    except KeyError:
        raise _not_found() from None


def _extra(section: str, data: dict[str, Any]) -> dict[str, Any]:
    if section == "skills":
        data["normalized_name"] = " ".join(data["name"].lower().split())
    return data


def _editable(row: Any) -> dict[str, Any]:
    return {
        c.name: getattr(row, c.name)
        for c in row.__table__.columns
        if c.name not in _SYSTEM_COLUMNS
    }


def list_items(db: Session, profile: StudentProfile, section: str) -> list[Any]:
    model, _ = _spec(section)
    return list(
        db.scalars(
            select(model)
            .where(model.profile_id == profile.id)
            .order_by(model.created_at)
        )
    )


def get_item(db: Session, profile: StudentProfile, section: str, item_id: uuid.UUID):
    model, _ = _spec(section)
    row = db.scalar(
        select(model).where(model.id == item_id, model.profile_id == profile.id)
    )
    if row is None:
        raise _not_found()
    return row


def _commit_unique(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise AppError("DUPLICATE", "You already have this item.", 409) from None


def create_item(
    db: Session,
    profile: StudentProfile,
    section: str,
    data: dict[str, Any],
    source_type: str = "USER_ENTERED",
):
    model, schema = _spec(section)
    clean = _extra(section, schema.model_validate(data).model_dump())
    row = model(profile_id=profile.id, source_type=source_type, **clean)
    db.add(row)
    _bump(profile)
    _commit_unique(db)
    return row


def update_item(
    db: Session, profile: StudentProfile, section: str, item_id: uuid.UUID, patch: dict
):
    _, schema = _spec(section)
    row = get_item(db, profile, section, item_id)
    clean = _extra(
        section, schema.model_validate({**_editable(row), **patch}).model_dump()
    )
    for key, value in clean.items():
        setattr(row, key, value)
    # An edit by the user is their own statement, not a platform-verified fact.
    row.source_type = "USER_ENTERED"
    row.verification_state = "UNVERIFIED"
    _bump(profile)
    _commit_unique(db)
    return row


def delete_item(db: Session, profile: StudentProfile, section: str, item_id: uuid.UUID):
    row = get_item(db, profile, section, item_id)
    db.delete(row)
    _bump(profile)
    db.commit()


def completeness(db: Session, profile: StudentProfile) -> dict[str, Any]:
    checks = {
        "basics": bool(profile.display_name and profile.headline),
        "target_roles": bool(profile.target_roles),
        "education": bool(list_items(db, profile, "education")),
        "skills": bool(list_items(db, profile, "skills")),
        "projects": bool(list_items(db, profile, "projects")),
        "experience": bool(list_items(db, profile, "experience")),
    }
    done = sum(checks.values())
    return {"percent": round(100 * done / len(checks)), "sections": checks}


# ---- Proposals ----------------------------------------------------------
def create_proposal(
    db: Session,
    profile: StudentProfile,
    section: str,
    action: str,
    payload: dict,
    target_id: uuid.UUID | None = None,
    source: str = "AI_SUGGESTED",
) -> Proposal:
    """Called by other modules. Never writes to profile tables directly."""
    _spec(section)
    if action not in ("create", "update", "delete"):
        raise AppError("BAD_REQUEST", "Unknown proposal action.", 400)
    proposal = Proposal(
        profile_id=profile.id,
        section=section,
        action=action,
        payload=payload,
        target_id=target_id,
        base_profile_version=profile.version,
        source=source,
    )
    db.add(proposal)
    db.commit()
    return proposal


def list_proposals(db: Session, profile: StudentProfile) -> list[Proposal]:
    return list(
        db.scalars(
            select(Proposal)
            .where(Proposal.profile_id == profile.id, Proposal.status == "PENDING")
            .order_by(Proposal.created_at)
        )
    )


def _get_pending(
    db: Session, profile: StudentProfile, proposal_id: uuid.UUID
) -> Proposal:
    proposal = db.scalar(
        select(Proposal).where(
            Proposal.id == proposal_id, Proposal.profile_id == profile.id
        )
    )
    if proposal is None:
        raise _not_found()
    if proposal.status != "PENDING":
        raise AppError("CONFLICT", "This proposal was already decided.", 409)
    return proposal


def approve_proposal(
    db: Session, profile: StudentProfile, proposal_id: uuid.UUID
) -> Proposal:
    proposal = _get_pending(db, profile, proposal_id)
    # Creates cannot conflict with later edits, so many can be approved in any order.
    # Updates and deletes target a row that may have changed, so they must be fresh.
    if proposal.action != "create" and proposal.base_profile_version != profile.version:
        raise AppError(
            "PROFILE_CHANGED",
            "Your profile changed since this suggestion was made. Ask for a new one.",
            409,
        )
    # One transaction: row change, version bump and proposal status together.
    _, schema = _spec(proposal.section)
    if proposal.action == "create":
        model, _ = _spec(proposal.section)
        clean = _extra(
            proposal.section, schema.model_validate(proposal.payload).model_dump()
        )
        db.add(
            model(
                profile_id=profile.id,
                source_type=proposal.source,
                verification_state="USER_CONFIRMED",
                **clean,
            )
        )
    elif proposal.action == "update":
        row = get_item(db, profile, proposal.section, proposal.target_id)
        clean = _extra(
            proposal.section,
            schema.model_validate({**_editable(row), **proposal.payload}).model_dump(),
        )
        for key, value in clean.items():
            setattr(row, key, value)
        row.verification_state = "USER_CONFIRMED"
    else:
        db.delete(get_item(db, profile, proposal.section, proposal.target_id))
    proposal.status = "APPROVED"
    proposal.decided_at = datetime.now(timezone.utc)
    _bump(profile)
    _commit_unique(db)
    return proposal


def reject_proposal(
    db: Session, profile: StudentProfile, proposal_id: uuid.UUID
) -> Proposal:
    proposal = _get_pending(db, profile, proposal_id)
    proposal.status = "REJECTED"  # kept for audit, never applied
    proposal.decided_at = datetime.now(timezone.utc)
    db.commit()
    return proposal
