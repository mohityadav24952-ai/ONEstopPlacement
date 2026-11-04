import copy
import datetime as dt
import hashlib
import json
import re
import uuid
from typing import Any

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.llm import LLMClient, get_llm_client
from app.ai.runner import run_structured
from app.core.errors import AppError
from app.db.models.coding import Repository
from app.db.models.portfolio import ConsentRecord, DeploymentRecord, Portfolio, PortfolioVersion
from app.db.models.profile import StudentProfile, User
from app.db.session import get_db
from app.modules.portfolio import content as cmod
from app.modules.portfolio import generator
from app.modules.portfolio.content import PortfolioContent
from app.modules.profile import service as profile_service
from app.modules.profile.router import current_profile
from app.modules.resume.facts import profile_hash
from app.modules.resume.skills import find_skills
from app.modules.resume.validator import _numbers
from app.shared.storage import Storage, get_storage

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


# ---- helpers -----------------------------------------------------------
def _slug(title: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:60] or "portfolio"


def _get_portfolio(db: Session, profile: StudentProfile, pid: uuid.UUID) -> Portfolio:
    p = db.scalar(select(Portfolio).where(Portfolio.id == pid, Portfolio.profile_id == profile.id))
    if p is None:
        raise AppError("NOT_FOUND", "That portfolio was not found.", 404)
    return p


def _get_version(db: Session, profile: StudentProfile, vid: uuid.UUID) -> PortfolioVersion:
    v = db.scalar(select(PortfolioVersion).where(PortfolioVersion.id == vid, PortfolioVersion.profile_id == profile.id))
    if v is None:
        raise AppError("NOT_FOUND", "That portfolio version was not found.", 404)
    return v


def _draft(v: PortfolioVersion) -> PortfolioVersion:
    if v.status != "DRAFT":
        raise AppError("VERSION_APPROVED", "Approved versions cannot be changed. Create a new draft.", 409)
    return v


def _allowed_links(db: Session, profile: StudentProfile) -> list[str]:
    links: list[str] = []
    for p in profile_service.list_items(db, profile, "projects"):
        links += p.links or []
    links += [a.url for a in profile_service.list_items(db, profile, "achievements") if a.url]
    links += list(db.scalars(select(Repository.url).where(Repository.profile_id == profile.id)))
    return links


def _content(v: PortfolioVersion) -> PortfolioContent:
    return PortfolioContent.model_validate(v.content)


def version_out(v: PortfolioVersion, profile: StudentProfile) -> dict[str, Any]:
    return {
        "id": str(v.id), "portfolio_id": str(v.portfolio_id), "status": v.status, "theme_id": v.theme_id,
        "theme_options": v.theme_options, "content": v.content, "validation_report": v.validation_report,
        "approved_at": v.approved_at.isoformat() if v.approved_at else None,
        "stale": v.profile_version_hash != profile_hash(profile), "has_export": bool(v.export_storage_key),
        "created_at": v.created_at.isoformat(),
    }


def _consent_hash(c: PortfolioContent, theme_id: str) -> str:
    return hashlib.sha256(json.dumps([cmod.consent_items(c), theme_id], sort_keys=True).encode()).hexdigest()


# ---- W5 draft ----------------------------------------------------------
class DraftOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    about: str = Field(default="", max_length=2000)
    project_blurbs: list[dict[str, str]] = Field(default_factory=list, max_length=30)


def build_base_content(db: Session, profile: StudentProfile, sections: list[str], project_ids: list[str] | None) -> PortfolioContent:
    user = db.get(User, profile.user_id)
    projects = []
    for p in profile_service.list_items(db, profile, "projects"):
        pid = f"project:{p.id}"
        if project_ids is not None and pid not in project_ids:
            continue
        projects.append({"id": pid, "title": p.title, "blurb": p.description or "", "tech": p.tech or [], "links": p.links or []})
    groups: dict[str, list[str]] = {}
    for s in profile_service.list_items(db, profile, "skills"):
        groups.setdefault(s.category or "Skills", []).append(s.name)
    return PortfolioContent.model_validate({
        "sections": sections,
        "hero": {"name": profile.display_name or "", "headline": profile.headline or ""},
        "about": {"text": profile.summary or ""},
        "projects": projects,
        "skills_groups": [{"group": g, "skills": s} for g, s in groups.items()],
        "education": [{"institution": e.institution, "degree": e.degree or ""} for e in profile_service.list_items(db, profile, "education")],
        "achievements": [{"title": a.title} for a in profile_service.list_items(db, profile, "achievements")],
        "contact": {"email": user.email if user else None, "location": profile.location_pref},  # both off by default
    })


def apply_ai_text(content: PortfolioContent, draft: DraftOut, fact_text: str) -> tuple[PortfolioContent, int]:
    """Accept AI text only when it adds no URL, contact detail, number or skill beyond the facts."""
    rejected = 0
    facts_low = fact_text.lower()
    facts_nums, facts_skills = _numbers(fact_text), set(find_skills(fact_text))

    def safe(text: str, cap: int) -> str | None:
        text = cmod.plain(text)
        if not text or len(text) > cap:
            return None
        if cmod._URL.search(text) or cmod._EMAIL.search(text) or cmod._PHONE.search(text):
            return None
        if not _numbers(text) <= facts_nums or not set(find_skills(text)) <= facts_skills:
            return None
        for i, tok in enumerate(re.findall(r"[A-Za-z][A-Za-z0-9+#.]*", text)):
            if i > 0 and tok[0].isupper() and tok.lower() not in facts_low:
                return None  # unknown proper noun
        return text

    if draft.about.strip():
        text = safe(draft.about, 600)
        if text:
            content.about.text = text
        else:
            rejected += 1
    by_id = {p.id: p for p in content.projects}
    for item in draft.project_blurbs:
        proj = by_id.get(item.get("project_id", ""))
        if proj is None:
            rejected += 1
            continue
        text = safe(item.get("blurb", ""), 300)
        if text:
            proj.blurb = text
        else:
            rejected += 1
    return content, rejected


def _fact_text(db: Session, profile: StudentProfile) -> str:
    parts = [profile.summary or "", profile.headline or "", profile.display_name or ""]
    for p in profile_service.list_items(db, profile, "projects"):
        parts += [p.title, p.description or "", p.contribution or "", *(p.outcomes or []), *(p.tech or [])]
    for e in profile_service.list_items(db, profile, "experience"):
        parts += [e.title, e.organization, *(e.description_points or [])]
    parts += [s.name for s in profile_service.list_items(db, profile, "skills")]
    parts += [e.institution for e in profile_service.list_items(db, profile, "education")]
    return " ".join(parts)


# ---- endpoints ---------------------------------------------------------
@router.get("/themes")
def list_themes(profile: StudentProfile = Depends(current_profile)):
    return [{"id": k, "name": t["name"], "description": t["description"], "options": {"accent": list(generator.ACCENTS)}}
            for k, t in generator.THEMES.items()]


class CreateIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=1, max_length=120)
    sections: list[str] = Field(default_factory=lambda: ["about", "projects", "skills", "education", "achievements", "contact"])
    project_ids: list[str] | None = Field(default=None, max_length=30)
    theme_id: str = "minimal"
    tone: str = Field(default="professional", pattern="^(professional|friendly|concise)$")


def _new_version(db, profile, portfolio, body_sections, project_ids, theme_id, tone, llm) -> tuple[PortfolioVersion, list[str]]:
    content = build_base_content(db, profile, body_sections, project_ids)
    notes: list[str] = []
    try:
        draft = run_structured(
            db, profile.id, llm, "portfolio_draft", "v1",
            {"tone": tone, "summary": profile.summary, "headline": profile.headline,
             "projects": [{"id": p.id, "title": p.title, "description": p.blurb, "tech": p.tech} for p in content.projects]},
            DraftOut)
        content, rejected = apply_ai_text(content, draft, _fact_text(db, profile))
        if rejected:
            notes.append(f"{rejected} AI-written text(s) were discarded because they added details not in your profile.")
    except AppError:
        notes.append("AI text is unavailable right now. The draft uses your own profile text.")
    version = PortfolioVersion(
        portfolio_id=portfolio.id, profile_id=profile.id, content=content.model_dump(), theme_id=theme_id,
        theme_options={"accent": "blue"}, profile_version_hash=profile_hash(profile),
    )
    db.add(version)
    return version, notes


@router.post("", status_code=201)
def create_portfolio(body: CreateIn, profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db),
                     llm: LLMClient = Depends(get_llm_client)):
    if body.theme_id not in generator.THEMES:
        raise AppError("VALIDATION_FAILED", "Unknown theme.", 422)
    try:
        PortfolioContent(sections=body.sections)
    except ValidationError:
        raise AppError("VALIDATION_FAILED", "Unknown section.", 422) from None
    slug, n = _slug(body.title), 1
    while db.scalar(select(Portfolio).where(Portfolio.profile_id == profile.id, Portfolio.slug == slug)):
        n += 1
        slug = f"{_slug(body.title)}-{n}"
    portfolio = Portfolio(profile_id=profile.id, title=body.title.strip(), slug=slug, selected_theme_id=body.theme_id)
    db.add(portfolio)
    db.flush()
    version, notes = _new_version(db, profile, portfolio, body.sections, body.project_ids, body.theme_id, body.tone, llm)
    db.commit()
    return {"portfolio_id": str(portfolio.id), "version": version_out(version, profile), "notes": notes}


@router.get("")
def list_portfolios(profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)):
    out = []
    for p in db.scalars(select(Portfolio).where(Portfolio.profile_id == profile.id).order_by(Portfolio.created_at.desc())):
        versions = list(db.scalars(select(PortfolioVersion).where(PortfolioVersion.portfolio_id == p.id).order_by(PortfolioVersion.created_at.desc())))
        out.append({"id": str(p.id), "title": p.title, "slug": p.slug,
                    "versions": [{"id": str(v.id), "status": v.status, "theme_id": v.theme_id, "created_at": v.created_at.isoformat(),
                                  "stale": v.profile_version_hash != profile_hash(profile)} for v in versions]})
    return out


@router.post("/{portfolio_id}/versions", status_code=201)
def new_draft(portfolio_id: uuid.UUID, body: CreateIn, profile: StudentProfile = Depends(current_profile),
              db: Session = Depends(get_db), llm: LLMClient = Depends(get_llm_client)):
    portfolio = _get_portfolio(db, profile, portfolio_id)
    version, notes = _new_version(db, profile, portfolio, body.sections, body.project_ids, body.theme_id, body.tone, llm)
    db.commit()
    return {"version": version_out(version, profile), "notes": notes}


@router.delete("/{portfolio_id}", status_code=204)
def delete_portfolio(portfolio_id: uuid.UUID, profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db),
                     storage: Storage = Depends(get_storage)):
    portfolio = _get_portfolio(db, profile, portfolio_id)
    for v in db.scalars(select(PortfolioVersion).where(PortfolioVersion.portfolio_id == portfolio.id)):
        if v.export_storage_key:
            storage.delete(v.export_storage_key)
    db.delete(portfolio)
    db.commit()
    return Response(status_code=204)


@router.get("/versions/{version_id}")
def read_version(version_id: uuid.UUID, profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)):
    return version_out(_get_version(db, profile, version_id), profile)


class EditIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    hero: dict[str, str] | None = None
    about_text: str | None = Field(default=None, max_length=2000)
    project_blurbs: dict[str, str] = Field(default_factory=dict, max_length=30)
    remove_project_ids: list[str] = Field(default_factory=list, max_length=30)
    sections: list[str] | None = None
    theme_id: str | None = None
    accent: str | None = None
    include_email: bool | None = None
    include_location: bool | None = None


@router.patch("/versions/{version_id}")
def edit_version(version_id: uuid.UUID, body: EditIn, profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)):
    v = _draft(_get_version(db, profile, version_id))
    data = copy.deepcopy(v.content)
    if body.hero:
        data["hero"] = {**data["hero"], **{k: val for k, val in body.hero.items() if k in ("name", "headline")}}
    if body.about_text is not None:
        data["about"]["text"] = body.about_text
    ids = {p["id"] for p in data["projects"]}
    for pid, blurb in body.project_blurbs.items():
        if pid not in ids:
            raise AppError("VALIDATION_FAILED", "Unknown project.", 422)
        next(p for p in data["projects"] if p["id"] == pid)["blurb"] = blurb
    data["projects"] = [p for p in data["projects"] if p["id"] not in set(body.remove_project_ids)]
    if body.sections is not None:
        data["sections"] = body.sections
    if body.include_email is not None:
        data["contact"]["include_email"] = body.include_email
    if body.include_location is not None:
        data["contact"]["include_location"] = body.include_location
    try:
        content = PortfolioContent.model_validate(data)  # sanitises text again
    except ValidationError as exc:
        raise exc
    if body.theme_id is not None:
        if body.theme_id not in generator.THEMES:
            raise AppError("VALIDATION_FAILED", "Unknown theme.", 422)
        v.theme_id = body.theme_id
    if body.accent is not None:
        if body.accent not in generator.ACCENTS:
            raise AppError("VALIDATION_FAILED", "Unknown accent colour.", 422)
        v.theme_options = {**v.theme_options, "accent": body.accent}
    v.content = content.model_dump()
    v.validation_report = None  # must be re-run after any edit
    db.commit()
    return version_out(v, profile)


@router.get("/versions/{version_id}/preview")
def preview(version_id: uuid.UUID, profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)):
    v = _get_version(db, profile, version_id)
    html = generator.render_html(_content(v), v.theme_id, v.theme_options, preview=True)
    return Response(html, media_type="text/html",
                    headers={"Content-Security-Policy": "sandbox; default-src 'none'; style-src 'unsafe-inline'", "X-Content-Type-Options": "nosniff"})


@router.post("/versions/{version_id}/validate")
def run_validate(version_id: uuid.UUID, profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)):
    v = _get_version(db, profile, version_id)
    report = cmod.validate(_content(v), _allowed_links(db, profile))
    v.validation_report = report
    db.commit()
    return report


@router.get("/versions/{version_id}/consent-summary")
def consent_summary(version_id: uuid.UUID, profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)):
    v = _get_version(db, profile, version_id)
    c = _content(v)
    return {"items": cmod.consent_items(c), "summary_hash": _consent_hash(c, v.theme_id),
            "statement": "Anything listed here becomes public if you publish the exported site."}


class ApproveIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    consent_summary_hash: str


@router.post("/versions/{version_id}/approve")
def approve(version_id: uuid.UUID, body: ApproveIn, profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)):
    v = _draft(_get_version(db, profile, version_id))
    c = _content(v)
    report = cmod.validate(c, _allowed_links(db, profile))  # always re-check at approval time
    v.validation_report = report
    if not report["ok"]:
        db.commit()
        raise AppError("VALIDATION_BLOCKED", "Fix the blocking problems before approving.", 409, {"errors": report["errors"]})
    expected = _consent_hash(c, v.theme_id)
    if body.consent_summary_hash != expected:
        raise AppError("CONSENT_MISMATCH", "The content changed since you reviewed it. Review the summary again.", 409)
    db.add(ConsentRecord(profile_id=profile.id, scope="PUBLISH_PORTFOLIO", summary_hash=expected))
    v.status = "APPROVED"
    v.approved_at = dt.datetime.now(dt.timezone.utc)
    db.commit()
    return version_out(v, profile)


@router.post("/versions/{version_id}/export")
def export(version_id: uuid.UUID, profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db),
           storage: Storage = Depends(get_storage)):
    v = _get_version(db, profile, version_id)
    if v.status != "APPROVED":
        raise AppError("NOT_APPROVED", "Approve this portfolio before exporting.", 409)
    consent = db.scalar(select(ConsentRecord).where(ConsentRecord.profile_id == profile.id, ConsentRecord.scope == "PUBLISH_PORTFOLIO",
                                                    ConsentRecord.revoked_at.is_(None)).order_by(ConsentRecord.granted_at.desc()))
    record = DeploymentRecord(profile_id=profile.id, portfolio_version_id=v.id, target="ZIP", status="RUNNING",
                              consent_id=consent.id if consent else None)
    db.add(record)
    try:
        data = generator.build_zip(_content(v), v.theme_id, v.theme_options)
        if v.export_storage_key:
            storage.delete(v.export_storage_key)
        v.export_storage_key = storage.put(str(profile.id), data, ".zip")
        record.status = "SUCCEEDED"
    except Exception:
        record.status, record.error_code = "FAILED", "EXPORT_FAILED"
        record.finished_at = dt.datetime.now(dt.timezone.utc)
        db.commit()
        raise AppError("EXPORT_FAILED", "Could not build the export. Try again.", 500) from None
    record.finished_at = dt.datetime.now(dt.timezone.utc)
    db.commit()
    return version_out(v, profile)


@router.get("/versions/{version_id}/export")
def download(version_id: uuid.UUID, profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db),
             storage: Storage = Depends(get_storage)):
    v = _get_version(db, profile, version_id)
    if not v.export_storage_key:
        raise AppError("NOT_FOUND", "No export exists for this version.", 404)
    return Response(storage.get(v.export_storage_key), media_type="application/zip",
                    headers={"Content-Disposition": 'attachment; filename="portfolio.zip"'})
