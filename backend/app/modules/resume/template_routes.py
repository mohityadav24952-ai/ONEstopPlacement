"""Resume template picker API: list the four templates, preview and export a version in one of them,
and edit the header and skills (bullets and summary keep using PATCH /resume/versions/{id})."""
import copy
import json
import uuid
from typing import Literal

from fastapi import APIRouter, Depends, Query, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.ratelimit import limit
from app.db.models.profile import StudentProfile
from app.db.models.resume import ResumeDocument
from app.db.session import get_db
from app.modules.profile.router import current_profile
from app.modules.resume import templates as tpl
from app.modules.resume.versions import _draft, _get, version_out
from app.shared.storage import Storage, get_storage

router = APIRouter(prefix="/resume/templates", tags=["resume"])

TemplateId = Literal["classic", "intern", "modern", "clone"]
NOTE = "This is a close match to your resume's fonts, header and section order, not a pixel-perfect copy."


def _source_doc(db: Session, profile: StudentProfile, document_id: uuid.UUID | None) -> ResumeDocument | None:
    q = select(ResumeDocument).where(ResumeDocument.profile_id == profile.id)
    if document_id:
        q = q.where(ResumeDocument.id == document_id)
    return db.scalar(q.order_by(ResumeDocument.created_at.desc()).limit(1))


def _clone(db: Session, profile: StudentProfile, storage: Storage, document_id: uuid.UUID | None):
    """(document, analysis, reason). `reason` explains why template 4 is unavailable."""
    doc = _source_doc(db, profile, document_id)
    if doc is None:
        return None, None, "Upload your resume in step 1 to use a template that matches it."
    try:
        data = storage.get(doc.storage_key)
    except (FileNotFoundError, AppError):
        return doc, None, "Your uploaded file is no longer available. Upload it again."
    analysis = tpl.analyze_layout(data, doc.mime_type)
    if analysis is None:
        return doc, None, "We could not read the layout of your uploaded file (for example a scanned image), so this template is unavailable."
    return doc, analysis, None


def _layout_for(template_id: str, db, profile, storage, document_id) -> tpl.LayoutProfile:
    if template_id in tpl.PRESETS:
        return tpl.PRESETS[template_id]
    _, analysis, reason = _clone(db, profile, storage, document_id)
    if analysis is None:
        raise AppError("TEMPLATE_UNAVAILABLE", reason or "That template is unavailable.", 409)
    return analysis.profile


@router.get("")
def list_templates(
    document_id: uuid.UUID | None = None,
    profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db),
    storage: Storage = Depends(get_storage),
):
    """Exactly four templates. Template 4 says whether it can be built from the user's uploaded file."""
    doc, analysis, reason = _clone(db, profile, storage, document_id)
    out = []
    for t in tpl.TEMPLATES:
        item = {**t, "available": True, "reason": None}
        if t["id"] == "clone":
            item.update(
                available=analysis is not None, reason=reason, note=NOTE,
                source_name=doc.original_name if doc else None, matched=analysis.matched if analysis else [],
                document_id=str(doc.id) if doc else None,
            )
        out.append(item)
    return out


@router.get("/versions/{version_id}/preview")
def preview(
    version_id: uuid.UUID, template_id: TemplateId, document_id: uuid.UUID | None = Query(default=None),
    profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db),
    storage: Storage = Depends(get_storage),
):
    """The version's CURRENT content (including unsaved-to-PDF edits) rendered as a PDF, for live preview."""
    v = _get(db, profile, version_id)
    data, fit = tpl.render_resume_fit(v.content, _layout_for(template_id, db, profile, storage, document_id))
    return Response(data, media_type="application/pdf", headers={
        "Content-Disposition": 'inline; filename="preview.pdf"', "Cache-Control": "no-store",
        "X-Resume-Fit": json.dumps(fit.as_dict()), "Access-Control-Expose-Headers": "X-Resume-Fit"})


@router.get("/versions/{version_id}/fit")
def fit_report(
    version_id: uuid.UUID, template_id: TemplateId, document_id: uuid.UUID | None = Query(default=None),
    profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db),
    storage: Storage = Depends(get_storage),
):
    """How the version fits on ONE page in this template: pages, the size scale used, and anything left out of the PDF."""
    v = _get(db, profile, version_id)
    return tpl.render_resume_fit(v.content, _layout_for(template_id, db, profile, storage, document_id))[1].as_dict()


class ExportIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    template_id: TemplateId
    document_id: uuid.UUID | None = None


@router.post("/versions/{version_id}/export", dependencies=[Depends(limit("export", 20, 60))])
def export(
    version_id: uuid.UUID, body: ExportIn,
    profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db),
    storage: Storage = Depends(get_storage),
):
    """Creates the final PDF in the chosen template. Same rule as the default export: approved versions only.
    Download it afterwards with GET /resume/versions/{id}/pdf."""
    v = _get(db, profile, version_id)
    if v.status != "APPROVED":
        raise AppError("NOT_APPROVED", "Approve this version before creating a PDF.", 409)
    data, fit = tpl.render_resume_fit(v.content, _layout_for(body.template_id, db, profile, storage, body.document_id))
    if v.pdf_storage_key:
        storage.delete(v.pdf_storage_key)
    v.pdf_storage_key = storage.put(str(profile.id), data, ".pdf")
    v.template_id = body.template_id
    db.commit()
    return {**version_out(v, profile, full=False), "fit": fit.as_dict()}  # fit: pages, scale, and anything left out of the PDF


class FieldsIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str | None = Field(default=None, min_length=1, max_length=120)
    headline: str | None = Field(default=None, max_length=200)
    email: str | None = Field(default=None, max_length=320)
    location: str | None = Field(default=None, max_length=120)
    skills: list[str] | None = Field(default=None, max_length=60)


@router.patch("/versions/{version_id}/fields")
def edit_fields(
    version_id: uuid.UUID, body: FieldsIn,
    profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db),
):
    """Contact details are the user's own words. Skills can only be reordered or removed here: a skill
    must exist in the profile (with its evidence) before it can appear on a resume."""
    v = _draft(_get(db, profile, version_id))
    content = copy.deepcopy(v.content)
    header = content.setdefault("header", {})
    sent = body.model_dump(exclude_unset=True, exclude={"skills"})
    for key, value in sent.items():
        header[key] = (value or "").strip() or None
    if body.skills is not None:
        allowed = set(content.get("skills", []))
        chosen = [s for s in dict.fromkeys(body.skills)]
        if not set(chosen) <= allowed:
            raise AppError(
                "VALIDATION_FAILED",
                "You can only reorder or remove skills here. Add new skills to your profile first.", 422,
            )
        content["skills"] = chosen
    v.content = content
    db.commit()
    return version_out(v, profile)
