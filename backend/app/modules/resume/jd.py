import hashlib
import re
import uuid
from typing import Any, Literal

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.llm import LLMClient, get_llm_client
from app.ai.runner import run_structured
from app.core.errors import AppError
from app.db.models.profile import StudentProfile
from app.db.models.resume import JobDescription, ResumeAnalysis
from app.db.session import get_db
from app.modules.profile.router import current_profile
from app.modules.resume import facts as facts_mod

router = APIRouter(tags=["resume"])


def sanitize(text: str) -> str:
    text = re.sub(r"<[^>]{0,200}>", " ", text)  # strip tags
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text)
    text = re.sub(r"[ \t]+", " ", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


class JdIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str = Field(min_length=50, max_length=15000)
    company: str | None = Field(default=None, max_length=200)
    role_title: str | None = Field(default=None, max_length=200)
    level: str | None = Field(default=None, max_length=50)
    source_url: str | None = Field(default=None, max_length=500)

    @field_validator("source_url")
    @classmethod
    def https_only(cls, v: str | None) -> str | None:
        if v and not v.lower().startswith("https://"):
            raise ValueError("Links must start with https://")
        return v or None


def jd_out(jd: JobDescription, full: bool = False) -> dict[str, Any]:
    out = {
        "id": str(jd.id), "company": jd.company, "role_title": jd.role_title, "level": jd.level,
        "source_url": jd.source_url, "created_at": jd.created_at.isoformat(), "length": len(jd.text),
    }
    if full:
        out["text"] = jd.text
    return out


def get_jd(db: Session, profile: StudentProfile, jd_id: uuid.UUID) -> JobDescription:
    jd = db.scalar(
        select(JobDescription).where(JobDescription.id == jd_id, JobDescription.profile_id == profile.id)
    )
    if jd is None:
        raise AppError("NOT_FOUND", "That job description was not found.", 404)
    return jd


@router.post("/job-descriptions")
def create_jd(
    body: JdIn,
    response: Response,
    profile: StudentProfile = Depends(current_profile),
    db: Session = Depends(get_db),
):
    text = sanitize(body.text)
    if len(text) < 50:
        raise AppError("VALIDATION_FAILED", "That job description is too short.", 422)
    digest = hashlib.sha256(text.encode()).hexdigest()
    existing = db.scalar(
        select(JobDescription).where(JobDescription.profile_id == profile.id, JobDescription.text_hash == digest)
    )
    if existing:
        return jd_out(existing, full=True)
    jd = JobDescription(
        profile_id=profile.id, text=text, text_hash=digest, company=body.company,
        role_title=body.role_title, level=body.level, source_url=body.source_url,
    )
    db.add(jd)
    db.commit()
    response.status_code = 201
    return jd_out(jd, full=True)


@router.get("/job-descriptions")
def list_jds(profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(JobDescription).where(JobDescription.profile_id == profile.id).order_by(JobDescription.created_at.desc())
    )
    return [jd_out(j) for j in rows]


@router.get("/job-descriptions/{jd_id}")
def read_jd(jd_id: uuid.UUID, profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)):
    return jd_out(get_jd(db, profile, jd_id), full=True)


@router.delete("/job-descriptions/{jd_id}", status_code=204)
def delete_jd(jd_id: uuid.UUID, profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)):
    db.delete(get_jd(db, profile, jd_id))  # analyses cascade
    db.commit()
    return Response(status_code=204)


# ---- W2: requirement extraction -----------------------------------------
Category = Literal["skill", "tool", "domain", "soft", "experience-level"]


class RequirementOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    text: str = Field(min_length=1, max_length=200)
    category: Category
    importance: Literal["must", "nice"] = "must"
    jd_quote: str = Field(min_length=1, max_length=600)


class JdExtraction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    requirements: list[RequirementOut] = Field(max_length=60)
    jd_quality: Literal["ok", "low"] = "ok"


def _flat(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()


def ground_requirements(extraction: JdExtraction, jd_text: str) -> tuple[list[dict], str]:
    """Keep only requirements whose quote really appears in the JD; merge duplicates."""
    source = _flat(jd_text)
    seen: set[str] = set()
    out: list[dict] = []
    for r in extraction.requirements:
        key = r.text.strip().lower()
        if key in seen or _flat(r.jd_quote) not in source:
            continue
        seen.add(key)
        out.append({"id": f"r{len(out) + 1}", **r.model_dump()})
    quality = "low" if extraction.jd_quality == "low" or len(out) < 2 else "ok"
    return out, quality


def analysis_out(a: ResumeAnalysis, current_hash: str) -> dict[str, Any]:
    return {
        "id": str(a.id), "jd_id": str(a.jd_id), "requirements": a.requirements, "matches": a.matches,
        "jd_quality": a.jd_quality, "stale": a.profile_version_hash != current_hash,
        "created_at": a.created_at.isoformat(),
    }


class AnalysisIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    jd_id: uuid.UUID


@router.post("/resume/analyses", status_code=201)
def create_analysis(
    body: AnalysisIn,
    profile: StudentProfile = Depends(current_profile),
    db: Session = Depends(get_db),
    llm: LLMClient = Depends(get_llm_client),
):
    jd = get_jd(db, profile, body.jd_id)
    extraction = run_structured(
        db, profile.id, llm, "jd_extract", "v1",
        {"jd_text": jd.text, "company": jd.company, "role": jd.role_title}, JdExtraction,
    )
    requirements, quality = ground_requirements(extraction, jd.text)
    facts = facts_mod.build_facts(db, profile)
    analysis = ResumeAnalysis(
        profile_id=profile.id, jd_id=jd.id, requirements=requirements, jd_quality=quality,
        matches=facts_mod.match_requirements(requirements, facts),
        profile_version_hash=facts_mod.profile_hash(profile),
    )
    db.add(analysis)
    db.commit()
    return analysis_out(analysis, facts_mod.profile_hash(profile))


@router.get("/resume/analyses/{analysis_id}")
def read_analysis(analysis_id: uuid.UUID, profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)):
    return analysis_out(get_analysis(db, profile, analysis_id), facts_mod.profile_hash(profile))


def get_analysis(db: Session, profile: StudentProfile, analysis_id: uuid.UUID) -> ResumeAnalysis:
    a = db.scalar(
        select(ResumeAnalysis).where(ResumeAnalysis.id == analysis_id, ResumeAnalysis.profile_id == profile.id)
    )
    if a is None:
        raise AppError("NOT_FOUND", "That analysis was not found.", 404)
    return a
