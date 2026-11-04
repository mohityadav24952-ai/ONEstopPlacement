import hashlib
import os
import uuid
from typing import Any

from fastapi import APIRouter, Depends, File, Response, UploadFile
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.llm import LLMClient, get_llm_client
from app.ai.runner import run_structured
from app.core.config import get_settings
from app.core.errors import AppError
from app.core.ratelimit import limit
from app.db.models.profile import Skill, StudentProfile
from app.db.models.resume import ResumeDocument
from app.db.session import get_db
from app.modules.profile import service as profile_service
from app.modules.profile.router import current_profile
from app.modules.resume import parsing
from app.shared import documents
from app.shared.storage import Storage, get_storage

router = APIRouter(prefix="/resume/documents", tags=["resume"])


def _out(doc: ResumeDocument) -> dict[str, Any]:
    return {
        "id": str(doc.id),
        "original_name": doc.original_name,
        "mime_type": doc.mime_type,
        "size": doc.size,
        "page_count": doc.page_count,
        "parse_status": doc.parse_status,
        "created_at": doc.created_at.isoformat(),
    }


def _get(db: Session, profile: StudentProfile, doc_id: uuid.UUID) -> ResumeDocument:
    doc = db.scalar(
        select(ResumeDocument).where(
            ResumeDocument.id == doc_id, ResumeDocument.profile_id == profile.id
        )
    )
    if doc is None:
        raise AppError("NOT_FOUND", "That document was not found.", 404)
    return doc


@router.post("", dependencies=[Depends(limit("upload", 10, 60))])
def upload(
    response: Response,
    file: UploadFile = File(...),
    profile: StudentProfile = Depends(current_profile),
    db: Session = Depends(get_db),
    storage: Storage = Depends(get_storage),
):
    limit = get_settings().max_upload_mb * 1024 * 1024
    data = file.file.read(limit + 1)
    if len(data) > limit:
        raise AppError("PAYLOAD_TOO_LARGE", f"Files must be {get_settings().max_upload_mb} MB or smaller.", 413)
    if not data:
        raise AppError("VALIDATION_FAILED", "The file is empty.", 422)

    name = os.path.basename((file.filename or "resume").replace("\\", "/"))[:200] or "resume"
    mime = documents.detect_type(name, data)
    digest = hashlib.sha256(data).hexdigest()

    existing = db.scalar(
        select(ResumeDocument).where(
            ResumeDocument.profile_id == profile.id, ResumeDocument.sha256 == digest
        )
    )
    if existing:  # same file again: reuse instead of storing a duplicate
        response.status_code = 200
        return _out(existing)

    text, pages = documents.extract_text(mime, data)
    prefix = str(profile.id)
    key = storage.put(prefix, data, ".pdf" if mime == documents.PDF else ".docx")
    text_key = storage.put(prefix, text.encode("utf-8"), ".txt")
    doc = ResumeDocument(
        profile_id=profile.id, storage_key=key, text_storage_key=text_key,
        original_name=name, mime_type=mime, size=len(data), sha256=digest, page_count=pages,
    )
    db.add(doc)
    db.commit()
    response.status_code = 201
    return _out(doc)


@router.get("")
def list_documents(
    profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)
):
    docs = db.scalars(
        select(ResumeDocument)
        .where(ResumeDocument.profile_id == profile.id)
        .order_by(ResumeDocument.created_at.desc())
    )
    return [_out(d) for d in docs]


@router.post("/{doc_id}/parse", dependencies=[Depends(limit("ai", 20, 60))])
def parse(
    doc_id: uuid.UUID,
    profile: StudentProfile = Depends(current_profile),
    db: Session = Depends(get_db),
    storage: Storage = Depends(get_storage),
    llm: LLMClient = Depends(get_llm_client),
):
    doc = _get(db, profile, doc_id)
    text = storage.get(doc.text_storage_key).decode("utf-8")
    try:
        parsed = run_structured(
            db, profile.id, llm, "resume_parse", "v1", {"text": text}, parsing.ParseOutput
        )
    except AppError:
        doc.parse_status = "FAILED"
        db.commit()
        raise
    doc.parsed = parsing.ground(parsed, text)
    doc.parse_status = "PARSED"
    db.commit()
    return {**_out(doc), "parsed": doc.parsed}


@router.get("/{doc_id}/parsed")
def get_parsed(
    doc_id: uuid.UUID,
    profile: StudentProfile = Depends(current_profile),
    db: Session = Depends(get_db),
):
    doc = _get(db, profile, doc_id)
    if doc.parsed is None:
        raise AppError("NOT_FOUND", "This document has not been parsed yet.", 404)
    return {**_out(doc), "parsed": doc.parsed}


class ImportBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    # The user's reviewed (possibly corrected) selection, keyed by profile section.
    items: dict[str, list[dict[str, Any]]]


@router.post("/{doc_id}/import")
def import_items(
    doc_id: uuid.UUID,
    body: ImportBody,
    profile: StudentProfile = Depends(current_profile),
    db: Session = Depends(get_db),
):
    """Creates proposals only. Nothing enters the profile until the user approves each one."""
    _get(db, profile, doc_id)
    existing_skills = set(
        db.scalars(select(Skill.normalized_name).where(Skill.profile_id == profile.id))
    )
    created = skipped = 0
    prepared = []
    for section, items in body.items.items():
        if section not in profile_service.SECTIONS:
            raise AppError("VALIDATION_FAILED", f"Unknown section: {section}", 422)
        _, schema = profile_service.SECTIONS[section]
        for fields in items:
            clean = schema.model_validate(fields).model_dump(mode="json", exclude_defaults=True)
            if section == "skills":
                norm = " ".join(clean["name"].lower().split())
                if norm in existing_skills:
                    skipped += 1
                    continue
                existing_skills.add(norm)
            prepared.append((section, clean))
    for section, clean in prepared:
        profile_service.create_proposal(
            db, profile, section, "create", clean, source="RESUME_EXTRACTED"
        )
        created += 1
    return {"proposals_created": created, "skipped_duplicates": skipped}


@router.delete("/{doc_id}", status_code=204)
def delete_document(
    doc_id: uuid.UUID,
    profile: StudentProfile = Depends(current_profile),
    db: Session = Depends(get_db),
    storage: Storage = Depends(get_storage),
):
    doc = _get(db, profile, doc_id)
    storage.delete(doc.storage_key)
    storage.delete(doc.text_storage_key)
    db.delete(doc)  # parsed data lives on the row, so it goes with it
    db.commit()
    return Response(status_code=204)
