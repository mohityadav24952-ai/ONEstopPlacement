import hashlib
import os
import uuid
from typing import Any

from typing import Literal

from fastapi import APIRouter, Depends, File, Response, UploadFile
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.llm import LLMClient, get_llm_client
from app.ai.runner import run_structured
from app.core.config import get_settings
from app.core.errors import AppError
from app.core.ratelimit import limit
from app.db.models.profile import Proposal, Skill, StudentProfile
from app.db.models.resume import ResumeDocument
from app.db.session import get_db
from app.modules.profile import service as profile_service
from app.modules.profile.router import current_profile
from app.modules.resume import latex, parsing
from app.shared import documents
from app.modules.intake import service as intake_service
from app.shared.storage import Storage, get_storage

router = APIRouter(prefix="/resume/documents", tags=["resume"])

# Field names the parse prompt refers to as data.schema.
PARSE_SCHEMA = {
    "education": ["institution", "degree", "field", "grade", "source_span", "confidence"],
    "experience": ["organization", "title", "description_points", "source_span", "confidence"],
    "projects": ["title", "description", "points", "tech", "source_span", "confidence"],
    "skills": ["name", "category", "source_span", "confidence"],
    "achievements": ["title", "issuer", "source_span", "confidence"],
    "confidence": ["low", "medium", "high"],
}


def _out(doc: ResumeDocument) -> dict[str, Any]:
    return {
        "id": str(doc.id),
        "original_name": doc.original_name,
        "mime_type": doc.mime_type,
        "size": doc.size,
        "page_count": doc.page_count,
        "parse_status": doc.parse_status,
        "created_at": doc.created_at.isoformat(),
        "latex_links": doc.latex_links or [],
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
            db, profile.id, llm, "resume_parse", "v3", {"text": text, "schema": PARSE_SCHEMA}, parsing.ParseOutput
        )
    except AppError:
        doc.parse_status = "FAILED"
        db.commit()
        raise
    grounded = parsing.ground(parsed, text)
    parsing.add_detected_skills(grounded, text)  # the AI sometimes misses plain skills such as C++; the taxonomy does not
    doc.parsed = grounded
    doc.parse_status = "PARSED"
    db.commit()
    # First parse only: park coding links and basic details for the user's approval (never raises).
    intake_result = intake_service.on_first_parse(db, profile, doc, text, storage.get(doc.storage_key))
    return {**_out(doc), "parsed": doc.parsed, "intake": intake_result}


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
    # Everything already in the profile, or already waiting for approval, is skipped: importing the same
    # resume twice (or a resume that lists a project twice) must never create duplicate entries.
    known: dict[str, set[str]] = {s: set() for s in profile_service.SECTIONS}
    for section in profile_service.SECTIONS:
        for row in profile_service.list_items(db, profile, section):
            known[section].add(parsing.item_key(section, {c: getattr(row, c, None) for c in ("institution", "degree", "title", "organization", "name")}))
    for p in db.scalars(select(Proposal).where(Proposal.profile_id == profile.id, Proposal.status == "PENDING", Proposal.action == "create")):
        if p.section in known:
            known[p.section].add(parsing.item_key(p.section, p.payload or {}))
    created = skipped = 0
    prepared = []
    for section, items in body.items.items():
        if section not in profile_service.SECTIONS:
            raise AppError("VALIDATION_FAILED", f"Unknown section: {section}", 422)
        _, schema = profile_service.SECTIONS[section]
        for fields in items:
            clean = schema.model_validate(fields).model_dump(mode="json", exclude_defaults=True)
            key = parsing.item_key(section, clean)
            if key in known[section]:
                skipped += 1
                continue
            known[section].add(key)
            prepared.append((section, clean))
    for section, clean in prepared:
        profile_service.create_proposal(
            db, profile, section, "create", clean, source="RESUME_EXTRACTED"
        )
        created += 1
    return {"proposals_created": created, "skipped_duplicates": skipped}


# ---- Optional LaTeX source: hyperlinks the PDF text lost -------------------------------------------

@router.post("/{doc_id}/latex", dependencies=[Depends(limit("upload", 10, 60))])
def upload_latex(
    doc_id: uuid.UUID,
    file: UploadFile = File(...),
    profile: StudentProfile = Depends(current_profile),
    db: Session = Depends(get_db),
):
    """Reads \\href{url}{text} links from the .tex file the resume was built from. The file itself is not
    kept; only the links are, each one "pending" until the user allows or refuses it."""
    doc = _get(db, profile, doc_id)
    name = (file.filename or "").lower()
    if not name.endswith(".tex"):
        raise AppError("UNSUPPORTED_MEDIA_TYPE", "Upload the .tex file your resume was built from.", 415)
    data = file.file.read(latex.MAX_TEX_BYTES + 1)
    if len(data) > latex.MAX_TEX_BYTES:
        raise AppError("PAYLOAD_TOO_LARGE", "LaTeX files must be 512 KB or smaller.", 413)
    if not data.strip() or b"\x00" in data:
        raise AppError("VALIDATION_FAILED", "That does not look like a LaTeX text file.", 422)
    links = latex.extract_links(latex.decode(data))
    doc.latex_links = links
    db.commit()
    return _out(doc)


class LinkDecisionIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    # url -> decision. Links not mentioned keep their current status.
    decisions: dict[str, Literal["approved", "rejected"]] = Field(max_length=40)


@router.post("/{doc_id}/latex/decisions")
def decide_latex_links(
    doc_id: uuid.UUID,
    body: LinkDecisionIn,
    profile: StudentProfile = Depends(current_profile),
    db: Session = Depends(get_db),
):
    """The user's permission, per link. Only approved links are ever injected into a generated resume."""
    doc = _get(db, profile, doc_id)
    links = [dict(link) for link in (doc.latex_links or [])]
    urls = {link["url"] for link in links}
    unknown = set(body.decisions) - urls
    if unknown:
        raise AppError("VALIDATION_FAILED", "Unknown link.", 422)
    for link in links:
        if link["url"] in body.decisions:
            link["status"] = body.decisions[link["url"]]
    doc.latex_links = links  # reassign so the JSON change is persisted
    db.commit()
    return _out(doc)


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
