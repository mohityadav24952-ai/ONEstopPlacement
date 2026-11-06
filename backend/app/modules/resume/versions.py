import copy
import datetime as dt
import uuid
from typing import Any

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.llm import LLMClient, get_llm_client
from app.ai.runner import run_structured
from app.core.errors import AppError
from app.core.ratelimit import limit
from app.db.models.profile import StudentProfile, User
from app.db.models.resume import ResumeAnalysis, ResumeVersion
from app.db.session import get_db
from app.modules.profile import service as profile_service
from app.modules.profile.router import current_profile
from app.modules.resume import facts as facts_mod
from app.modules.resume import pdf, validator
from app.modules.resume import summary as summary_mod
from app.modules.resume.jd import get_analysis, get_jd
from app.shared.storage import Storage, get_storage

router = APIRouter(prefix="/resume/versions", tags=["resume"])


def _d(value) -> str | None:
    return value.isoformat() if value else None


def build_content(db: Session, profile: StudentProfile, analysis: ResumeAnalysis | None) -> dict:
    """Deterministic resume content straight from approved profile data. No AI involved."""
    facts = facts_mod.build_facts(db, profile)
    by_parent: dict[str, list[dict]] = {}
    for f in facts:
        if "#" in f.id:
            by_parent.setdefault(f.parent, []).append({"id": f.id, "text": f.text})

    wanted = set()
    relevance_of_skill: dict[str, int] = {}
    if analysis:
        wanted = {facts_mod.normalize(r["text"]) for r in analysis.requirements}

    def relevance(skills: set[str]) -> int:
        return len(skills & wanted)

    fact_skills = {f.parent: f.skills for f in facts if f.type in ("project", "experience")}
    user = db.get(User, profile.user_id)

    projects = []
    for p in profile_service.list_items(db, profile, "projects"):
        parent = f"project:{p.id}"
        projects.append({
            "id": parent, "title": p.title, "tech": p.tech or [], "links": p.links or [],
            "bullets": by_parent.get(parent, []),
            "_rel": relevance(set(fact_skills.get(parent, set()))),
        })
    projects.sort(key=lambda x: -x["_rel"])  # most relevant first; stable otherwise
    for p in projects:
        del p["_rel"]

    skills = profile_service.list_items(db, profile, "skills")
    skills.sort(key=lambda s: 0 if facts_mod.normalize(s.name) in wanted else 1)

    return {
        "header": {
            "name": profile.display_name, "headline": profile.headline,
            "location": profile.location_pref, "email": user.email if user else None,
        },
        "summary": {"text": profile.summary, "id": "summary"},
        "education": [
            {"id": f"education:{e.id}", "institution": e.institution, "degree": e.degree, "field": e.field,
             "start_date": _d(e.start_date), "end_date": _d(e.end_date), "grade": e.grade}
            for e in profile_service.list_items(db, profile, "education")
        ],
        "experience": [
            {"id": f"experience:{e.id}", "title": e.title, "organization": e.organization,
             "start_date": _d(e.start_date), "end_date": _d(e.end_date),
             "bullets": by_parent.get(f"experience:{e.id}", [])}
            for e in profile_service.list_items(db, profile, "experience")
        ],
        "projects": projects,
        "skills": [s.name for s in skills],
        "achievements": [
            {"id": f"achievement:{a.id}", "title": a.title, "issuer": a.issuer}
            for a in profile_service.list_items(db, profile, "achievements")
        ],
    }


def _bullets(content: dict) -> dict[str, dict]:
    out = {}
    for section in ("experience", "projects"):
        for entry in content.get(section, []):
            for b in entry["bullets"]:
                out[b["id"]] = b
    return out


def _flags_from(analysis: ResumeAnalysis, unverified: list[dict]) -> list[dict]:
    flags = []
    req = {r["id"]: r for r in analysis.requirements}
    for m in analysis.matches:
        r = req.get(m["requirement_id"])
        if r and m["status"] == "missing" and r["importance"] == "must":
            flags.append({
                "id": f"f{len(flags) + 1}", "requirement": r["text"],
                "question": f"The role asks for {r['text']}. Do you have real experience with it? "
                            "If yes, add it to your profile with evidence; if not, dismiss it. "
                            "It will not be added to your resume either way.",
                "resolved": False, "resolution": None,
            })
    for u in unverified[:5]:
        flags.append({"id": f"f{len(flags) + 1}", "requirement": None, "question": u["text"],
                      "resolved": False, "resolution": None})
    return flags


def version_out(v: ResumeVersion, profile: StudentProfile, full: bool = True) -> dict[str, Any]:
    out = {
        "id": str(v.id), "title": v.title, "status": v.status, "jd_id": str(v.jd_id) if v.jd_id else None,
        "parent_version_id": str(v.parent_version_id) if v.parent_version_id else None,
        "approved_at": _d(v.approved_at), "created_at": v.created_at.isoformat(),
        "stale": v.profile_version_hash != facts_mod.profile_hash(profile),
        "has_pdf": bool(v.pdf_storage_key), "template_id": v.template_id,
        "unresolved_flags": sum(1 for f in v.claim_flags if not f["resolved"]),
        "pending_proposals": sum(1 for p in v.change_list if p["status"] == "pending"),
    }
    if full:
        out.update(content=v.content, change_list=v.change_list, claim_flags=v.claim_flags)
    return out


def _get(db: Session, profile: StudentProfile, version_id: uuid.UUID) -> ResumeVersion:
    v = db.scalar(
        select(ResumeVersion).where(ResumeVersion.id == version_id, ResumeVersion.profile_id == profile.id)
    )
    if v is None:
        raise AppError("NOT_FOUND", "That resume version was not found.", 404)
    return v


def _draft(v: ResumeVersion) -> ResumeVersion:
    if v.status != "DRAFT":
        raise AppError("VERSION_APPROVED", "Approved versions cannot be changed. Create a new draft.", 409)
    return v


class VersionIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    analysis_id: uuid.UUID | None = None
    title: str | None = Field(default=None, max_length=200)


@router.post("", status_code=201, dependencies=[Depends(limit("ai", 20, 60))])
def create_version(
    body: VersionIn,
    profile: StudentProfile = Depends(current_profile),
    db: Session = Depends(get_db),
    llm: LLMClient = Depends(get_llm_client),
):
    analysis = get_analysis(db, profile, body.analysis_id) if body.analysis_id else None
    if analysis and analysis.profile_version_hash != facts_mod.profile_hash(profile):
        raise AppError("STALE_ANALYSIS", "Your profile changed since this analysis. Run the analysis again.", 409)

    content = build_content(db, profile, analysis)
    change_list: list[dict] = []
    flags: list[dict] = []
    notes: list[str] = []
    title = body.title or "General resume"
    jd_id = None

    if analysis:
        jd = get_jd(db, profile, analysis.jd_id)
        jd_id = jd.id
        title = body.title or f"Resume for {jd.role_title or 'target role'}" + (f" at {jd.company}" if jd.company else "")
        bullets = _bullets(content)
        facts = {f.id: f.text for f in facts_mod.build_facts(db, profile)}
        try:
            proposed = run_structured(
                db, profile.id, llm, "resume_propose", "v1",
                {"requirements": [{"id": r["id"], "text": r["text"]} for r in analysis.requirements],
                 "bullets": [{"id": b["id"], "text": b["text"]} for b in bullets.values()],
                 "facts": [{"id": k, "text": t} for k, t in facts.items()]},
                validator.ProposalSet,
            )
            change_list, unverified, rejected = validator.filter_proposals(proposed.proposals, {k: b["text"] for k, b in bullets.items()}, facts)
            if rejected:
                notes.append(f"{rejected} AI suggestion(s) were discarded because they were not supported by your profile.")
        except AppError:
            unverified = []
            notes.append("AI suggestions are unavailable right now. Your resume was built from your profile only.")
        flags = _flags_from(analysis, unverified)
        # A summary tailored to this job, from the candidate's own facts (falls back to a plain one; never raises)
        content["summary"] = {**content.get("summary", {}), **summary_mod.build_summary(
            db, profile, llm, content, role=jd.role_title, company=jd.company,
            requirements=[r["text"] for r in analysis.requirements])}

    version = ResumeVersion(
        profile_id=profile.id, jd_id=jd_id, analysis_id=analysis.id if analysis else None, title=title,
        content=content, change_list=change_list, claim_flags=flags,
        profile_version_hash=facts_mod.profile_hash(profile),
    )
    db.add(version)
    db.commit()
    return {**version_out(version, profile), "notes": notes}


@router.get("")
def list_versions(profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(ResumeVersion).where(ResumeVersion.profile_id == profile.id).order_by(ResumeVersion.created_at.desc())
    )
    return [version_out(v, profile, full=False) for v in rows]


@router.get("/{version_id}")
def read_version(version_id: uuid.UUID, profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)):
    return version_out(_get(db, profile, version_id), profile)


class EditIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str | None = Field(default=None, min_length=1, max_length=200)
    summary: str | None = Field(default=None, max_length=2000)
    bullet_edits: dict[str, str] = Field(default_factory=dict, max_length=100)
    remove_ids: list[str] = Field(default_factory=list, max_length=100)


@router.patch("/{version_id}")
def edit_version(
    version_id: uuid.UUID, body: EditIn,
    profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db),
):
    v = _draft(_get(db, profile, version_id))
    content = copy.deepcopy(v.content)
    bullets = _bullets(content)
    for bid, text in body.bullet_edits.items():
        if bid not in bullets:
            raise AppError("VALIDATION_FAILED", "Unknown bullet.", 422)
        if not text.strip() or len(text) > 500:
            raise AppError("VALIDATION_FAILED", "Bullets must be 1-500 characters.", 422)
        bullets[bid]["text"] = text.strip()
        bullets[bid]["user_edited"] = True  # the user's own words, marked as such
    remove = set(body.remove_ids)
    for section in ("experience", "projects"):
        content[section] = [e for e in content[section] if e["id"] not in remove]
        for e in content[section]:
            e["bullets"] = [b for b in e["bullets"] if b["id"] not in remove]
    for section in ("education", "achievements"):
        content[section] = [e for e in content[section] if e["id"] not in remove]
    if body.summary is not None:
        content["summary"] = {**content["summary"], "text": body.summary.strip() or None, "user_edited": True}
    if body.title:
        v.title = body.title
    v.content = content  # reassign so the JSON change is persisted
    db.commit()
    return version_out(v, profile)


def _decide(db, profile, version_id, pid, decision) -> dict:
    v = _draft(_get(db, profile, version_id))
    change_list = [dict(p) for p in v.change_list]
    proposal = next((p for p in change_list if p["id"] == pid), None)
    if proposal is None:
        raise AppError("NOT_FOUND", "That suggestion was not found.", 404)
    if proposal["status"] != "pending":
        raise AppError("CONFLICT", "That suggestion was already decided.", 409)
    proposal["status"] = decision
    if decision == "accepted":
        content = copy.deepcopy(v.content)
        bullet = _bullets(content).get(proposal["target"])
        if bullet is None or bullet["text"].strip() != proposal["before"]:
            raise AppError("CONFLICT", "That bullet changed. Reject this suggestion.", 409)
        bullet["text"] = proposal["after"]
        bullet["ai_assisted"] = True
        v.content = content
    v.change_list = change_list
    db.commit()
    return version_out(v, profile)


@router.post("/{version_id}/proposals/{pid}/accept")
def accept(version_id: uuid.UUID, pid: str, profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)):
    return _decide(db, profile, version_id, pid, "accepted")


@router.post("/{version_id}/proposals/{pid}/reject")
def reject(version_id: uuid.UUID, pid: str, profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)):
    return _decide(db, profile, version_id, pid, "rejected")


class FlagIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    resolution: str = Field(pattern="^(dismiss|recheck)$")


@router.post("/{version_id}/flags/{flag_id}/resolve")
def resolve_flag(
    version_id: uuid.UUID, flag_id: str, body: FlagIn,
    profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db),
):
    v = _draft(_get(db, profile, version_id))
    flags = [dict(f) for f in v.claim_flags]
    flag = next((f for f in flags if f["id"] == flag_id), None)
    if flag is None:
        raise AppError("NOT_FOUND", "That item was not found.", 404)
    if body.resolution == "dismiss":
        flag.update(resolved=True, resolution="dismissed")  # claim stays out of the resume
    else:
        # Re-check against the profile as it is now; only real evidence resolves it.
        canon = facts_mod.normalize(flag["requirement"] or "")
        found = flag["requirement"] and any(
            canon in f.skills for f in facts_mod.build_facts(db, profile) if f.type in ("skill", "project", "experience")
        )
        if not found:
            raise AppError("NO_EVIDENCE", "No evidence for this in your profile yet. Add it to your profile first, or dismiss it.", 409)
        flag.update(resolved=True, resolution="evidence_added")
    v.claim_flags = flags
    db.commit()
    return version_out(v, profile)


@router.post("/{version_id}/approve")
def approve(version_id: uuid.UUID, profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)):
    v = _draft(_get(db, profile, version_id))
    open_flags = [f for f in v.claim_flags if not f["resolved"]]
    if open_flags:
        raise AppError("UNRESOLVED_CLAIMS", "Resolve every flagged item before approving.", 409,
                       {"flags": [f["id"] for f in open_flags]})
    v.status = "APPROVED"
    v.approved_at = dt.datetime.now(dt.timezone.utc)
    db.commit()
    return version_out(v, profile)


@router.post("/{version_id}/pdf")
def render(
    version_id: uuid.UUID, profile: StudentProfile = Depends(current_profile),
    db: Session = Depends(get_db), storage: Storage = Depends(get_storage),
):
    v = _get(db, profile, version_id)
    if v.status != "APPROVED":
        raise AppError("NOT_APPROVED", "Approve this version before creating a PDF.", 409)
    data = pdf.render_pdf(v.content)
    if v.pdf_storage_key:
        storage.delete(v.pdf_storage_key)
    v.pdf_storage_key = storage.put(str(profile.id), data, ".pdf")
    db.commit()
    return version_out(v, profile, full=False)


@router.get("/{version_id}/pdf")
def download(
    version_id: uuid.UUID, profile: StudentProfile = Depends(current_profile),
    db: Session = Depends(get_db), storage: Storage = Depends(get_storage),
):
    v = _get(db, profile, version_id)
    if not v.pdf_storage_key:
        raise AppError("NOT_FOUND", "No PDF has been created for this version.", 404)
    return Response(
        storage.get(v.pdf_storage_key), media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="resume.pdf"'},
    )


@router.get("/{a}/diff/{b}")
def diff(a: uuid.UUID, b: uuid.UUID, profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)):
    va, vb = _get(db, profile, a), _get(db, profile, b)
    ba, bb = _bullets(va.content), _bullets(vb.content)
    changes = []
    for bid in sorted(set(ba) | set(bb)):
        before = ba.get(bid, {}).get("text")
        after = bb.get(bid, {}).get("text")
        if before != after:
            changes.append({"id": bid, "before": before, "after": after})
    sa, sb = va.content["summary"].get("text"), vb.content["summary"].get("text")
    if sa != sb:
        changes.append({"id": "summary", "before": sa, "after": sb})
    return {"changes": changes}


@router.delete("/{version_id}", status_code=204)
def delete_version(
    version_id: uuid.UUID, profile: StudentProfile = Depends(current_profile),
    db: Session = Depends(get_db), storage: Storage = Depends(get_storage),
):
    v = _get(db, profile, version_id)
    if v.pdf_storage_key:
        storage.delete(v.pdf_storage_key)
    db.delete(v)
    db.commit()
    return Response(status_code=204)
