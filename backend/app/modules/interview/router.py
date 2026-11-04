import datetime as dt
import hashlib
import re
import uuid
from typing import Any, Literal

from fastapi import APIRouter, Depends, Query, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.ai.llm import LLMClient, get_llm_client
from app.ai.runner import run_structured
from app.core.errors import AppError
from app.db.models.interview import (
    InterviewQuestion, PreparationSession, QuestionReport, QuestionSource, SessionQuestion,
)
from app.db.models.profile import StudentProfile
from app.db.session import get_db
from app.modules.interview import planner
from app.modules.interview.seed_data import BANK
from app.modules.profile import service as profile_service
from app.modules.profile.router import current_profile
from app.modules.resume.jd import get_jd
from app.modules.resume.skills import find_skills, normalize

router = APIRouter(prefix="/interview", tags=["interview"])

Topic = Literal["DSA", "OOP", "DBMS", "OS", "CN", "HR", "PROJECT"]
Difficulty = Literal["EASY", "MEDIUM", "HARD"]
STATES = ("TODO", "DONE", "REVISIT", "SKIPPED")
LABELS = {
    "OFFICIAL": "Official source",
    "CANDIDATE_REPORTED": "Reported by candidates (unverified)",
    "CURATED": "Curated practice question",
    "AI_GENERATED": "AI-generated practice question",
    "UNKNOWN": "Origin unknown",
}
MAX_REPORTS_PER_DAY = 20


def _hash(text: str) -> str:
    return hashlib.sha256(re.sub(r"\W+", " ", text.lower()).strip().encode()).hexdigest()


# ---- bank --------------------------------------------------------------
def seed_bank(db: Session) -> int:
    """Idempotent: inserts curated questions that are not already present."""
    have = set(db.scalars(select(InterviewQuestion.text_hash).where(InterviewQuestion.owner_profile_id.is_(None))))
    added = 0
    for topic, difficulty, sub, text in BANK:
        h = _hash(text)
        if h in have:
            continue
        q = InterviewQuestion(text=text, text_hash=h, topic=topic, subtopic=sub, difficulty=difficulty,
                              provenance_type="CURATED", role_tags=[])
        db.add(q)
        db.flush()
        db.add(QuestionSource(
            question_id=q.id, source_type="CURATED", title="Written for ONEstopPlacement",
            license_note="Original wording; not copied from any source.",
            reliability_note="Practice question. Not associated with any company.",
        ))
        added += 1
    db.commit()
    return added


def _ensure_project_questions(db: Session, profile: StudentProfile) -> None:
    have = set(db.scalars(select(InterviewQuestion.text_hash).where(InterviewQuestion.owner_profile_id == profile.id)))
    for p in profile_service.list_items(db, profile, "projects"):
        templates = [
            ("EASY", f"Walk me through your project \"{p.title}\": what problem does it solve and who is it for?"),
            ("MEDIUM", f"What was the hardest technical decision in \"{p.title}\", and what alternatives did you consider?"),
            ("MEDIUM", f"If you rebuilt \"{p.title}\" today, what would you change and why?"),
        ]
        if p.tech:
            templates.append(("MEDIUM", f"Why did you choose {', '.join(p.tech[:3])} for \"{p.title}\"? What are the trade-offs?"))
        for difficulty, text in templates:
            h = _hash(text)
            if h in have:
                continue
            q = InterviewQuestion(owner_profile_id=profile.id, text=text, text_hash=h, topic="PROJECT",
                                  difficulty=difficulty, provenance_type="CURATED", role_tags=[])
            db.add(q)
            db.flush()
            db.add(QuestionSource(question_id=q.id, source_type="CURATED", title="Generated from your own project",
                                  reliability_note="Template question about your approved project."))
            have.add(h)
    db.commit()


def _visible(profile: StudentProfile):
    return (InterviewQuestion.status == "ACTIVE",
            or_(InterviewQuestion.owner_profile_id.is_(None), InterviewQuestion.owner_profile_id == profile.id))


def _question_out(q: InterviewQuestion, sources: list[QuestionSource]) -> dict[str, Any]:
    return {
        "id": str(q.id), "text": q.text, "topic": q.topic, "subtopic": q.subtopic, "difficulty": q.difficulty,
        "provenance_type": q.provenance_type, "provenance_label": LABELS[q.provenance_type],
        "sources": [{"url": s.source_url, "title": s.title, "retrieved_at": s.retrieved_at.isoformat() if s.retrieved_at else None,
                     "license_note": s.license_note, "reliability_note": s.reliability_note} for s in sources],
    }


def _sources(db: Session, ids: list[uuid.UUID]) -> dict[uuid.UUID, list[QuestionSource]]:
    out: dict[uuid.UUID, list[QuestionSource]] = {}
    if ids:
        for s in db.scalars(select(QuestionSource).where(QuestionSource.question_id.in_(ids))):
            out.setdefault(s.question_id, []).append(s)
    return out


@router.get("/questions")
def list_questions(
    topic: Topic | None = None, difficulty: Difficulty | None = None, q: str | None = Query(default=None, max_length=100),
    provenance: Literal["OFFICIAL", "CANDIDATE_REPORTED", "CURATED", "AI_GENERATED", "UNKNOWN"] | None = None,
    limit: int = Query(default=20, ge=1, le=50), offset: int = Query(default=0, ge=0),
    profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db),
):
    seed_bank(db)
    stmt = select(InterviewQuestion).where(*_visible(profile))
    if topic:
        stmt = stmt.where(InterviewQuestion.topic == topic)
    if difficulty:
        stmt = stmt.where(InterviewQuestion.difficulty == difficulty)
    if provenance:
        stmt = stmt.where(InterviewQuestion.provenance_type == provenance)
    if q:
        like = "%" + q.replace("%", "").replace("_", "") + "%"
        stmt = stmt.where(InterviewQuestion.text.ilike(like))
    rows = list(db.scalars(stmt.order_by(InterviewQuestion.topic, InterviewQuestion.difficulty, InterviewQuestion.text).limit(limit).offset(offset)))
    src = _sources(db, [r.id for r in rows])
    return [_question_out(r, src.get(r.id, [])) for r in rows]


class ReportIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reason: str = Field(min_length=5, max_length=500)


@router.post("/questions/{question_id}/report", status_code=201)
def report_question(question_id: uuid.UUID, body: ReportIn, profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)):
    question = db.scalar(select(InterviewQuestion).where(InterviewQuestion.id == question_id, *_visible(profile)))
    if question is None:
        raise AppError("NOT_FOUND", "That question was not found.", 404)
    since = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=1)
    recent = db.scalar(select(func.count()).select_from(QuestionReport).where(
        QuestionReport.profile_id == profile.id, QuestionReport.created_at >= since))
    if recent >= MAX_REPORTS_PER_DAY:
        raise AppError("RATE_LIMITED", "You have sent many reports today. Please try again tomorrow.", 429)
    db.add(QuestionReport(question_id=question.id, profile_id=profile.id, reason=body.reason.strip()))
    db.commit()
    return {"reported": True}


# ---- sessions ----------------------------------------------------------
class SessionIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    company: str = Field(min_length=1, max_length=200)
    role: str = Field(min_length=1, max_length=200)
    level: str | None = Field(default=None, max_length=50)
    stage: str | None = Field(default=None, max_length=50)
    duration_days: int = Field(ge=1, le=60)
    jd_id: uuid.UUID | None = None


def _get(db: Session, profile: StudentProfile, session_id: uuid.UUID) -> PreparationSession:
    s = db.scalar(select(PreparationSession).where(PreparationSession.id == session_id, PreparationSession.profile_id == profile.id))
    if s is None:
        raise AppError("NOT_FOUND", "That session was not found.", 404)
    return s


def _gaps(db: Session, profile: StudentProfile, jd_skills: set[str]) -> list[dict]:
    have = {normalize(s.name) for s in profile_service.list_items(db, profile, "skills")}
    for p in profile_service.list_items(db, profile, "projects"):
        have |= {normalize(t) for t in (p.tech or [])}
    return [
        {"skill": s, "topic": planner.SKILL_TOPIC.get(s),
         "advice": f"The job description mentions {s}, which is not in your profile. Learn it, or add it with evidence if you already know it."}
        for s in sorted(jd_skills - have)
    ]


def session_out(db: Session, s: PreparationSession) -> dict[str, Any]:
    links = {l.question_id: l for l in db.scalars(select(SessionQuestion).where(SessionQuestion.session_id == s.id))}
    qs = {q.id: q for q in db.scalars(select(InterviewQuestion).where(InterviewQuestion.id.in_(list(links))))} if links else {}
    src = _sources(db, list(qs))
    days = []
    for day in s.plan["days"]:
        items = []
        for qid in day["question_ids"]:
            q = qs.get(uuid.UUID(qid))
            if q is None:
                continue
            link = links[q.id]
            items.append({**_question_out(q, src.get(q.id, [])), "state": link.state, "notes": link.notes})
        days.append({"day": day["day"], "topic": day["topic"], "questions": items})
    counts = {k: sum(1 for l in links.values() if l.state == k) for k in STATES}
    total = len(links)
    return {
        "id": str(s.id), "company": s.company, "role": s.role, "level": s.level, "stage": s.stage,
        "duration_days": s.duration_days, "jd_id": str(s.jd_id) if s.jd_id else None,
        "used_jd": bool(s.jd_id), "created_at": s.created_at.isoformat(),
        "days": days, "gaps": s.plan.get("gaps", []),
        "topics_without_questions": s.plan.get("topics_without_questions", []),
        "progress": {"total": total, **{k.lower(): v for k, v in counts.items()},
                     "percent_done": round(100 * counts["DONE"] / total) if total else 0},
        "note": "Questions are practice material. None is claimed to be asked by " + s.company + ".",
    }


@router.post("/sessions", status_code=201)
def create_session(body: SessionIn, profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)):
    jd_skills: set[str] = set()
    if body.jd_id:
        jd_skills = set(find_skills(get_jd(db, profile, body.jd_id).text))
    seed_bank(db)
    _ensure_project_questions(db, profile)
    has_projects = bool(profile_service.list_items(db, profile, "projects"))
    pool = [planner.QuestionRef(str(q.id), q.topic, q.difficulty, q.text)
            for q in db.scalars(select(InterviewQuestion).where(*_visible(profile), InterviewQuestion.provenance_type == "CURATED"))]
    plan = planner.build_plan(pool, planner.topic_weights(jd_skills, has_projects), body.duration_days)
    plan["gaps"] = _gaps(db, profile, jd_skills)
    session = PreparationSession(profile_id=profile.id, company=body.company.strip(), role=body.role.strip(),
                                 level=body.level, stage=body.stage, duration_days=body.duration_days,
                                 jd_id=body.jd_id, plan=plan)
    db.add(session)
    db.flush()
    for qid in dict.fromkeys(i for d in plan["days"] for i in d["question_ids"]):
        db.add(SessionQuestion(session_id=session.id, question_id=uuid.UUID(qid)))
    db.commit()
    return session_out(db, session)


@router.get("/sessions")
def list_sessions(profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)):
    rows = db.scalars(select(PreparationSession).where(PreparationSession.profile_id == profile.id).order_by(PreparationSession.created_at.desc()))
    return [{"id": str(s.id), "company": s.company, "role": s.role, "duration_days": s.duration_days,
             "created_at": s.created_at.isoformat()} for s in rows]


@router.get("/sessions/{session_id}")
def read_session(session_id: uuid.UUID, profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)):
    return session_out(db, _get(db, profile, session_id))


@router.delete("/sessions/{session_id}", status_code=204)
def delete_session(session_id: uuid.UUID, profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)):
    db.delete(_get(db, profile, session_id))
    db.commit()
    return Response(status_code=204)


class ProgressIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    state: Literal["TODO", "DONE", "REVISIT", "SKIPPED"]
    notes: str | None = Field(default=None, max_length=1000)


@router.put("/sessions/{session_id}/questions/{question_id}")
def save_progress(session_id: uuid.UUID, question_id: uuid.UUID, body: ProgressIn,
                  profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)):
    session = _get(db, profile, session_id)
    link = db.scalar(select(SessionQuestion).where(SessionQuestion.session_id == session.id, SessionQuestion.question_id == question_id))
    if link is None:
        raise AppError("NOT_FOUND", "That question is not in this session.", 404)
    link.state = body.state
    if "notes" in body.model_fields_set:
        link.notes = (body.notes or "").strip() or None
    db.commit()
    return session_out(db, session)


# ---- W4: AI-generated questions ----------------------------------------
class GenIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    topic: Topic
    count: int = Field(default=3, ge=1, le=5)


class GenQuestion(BaseModel):
    model_config = ConfigDict(extra="ignore")
    text: str = Field(min_length=15, max_length=400)
    difficulty: Difficulty = "MEDIUM"


class GenOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    questions: list[GenQuestion] = Field(max_length=10)


_COMPANY_CLAIM = re.compile(r"\b(was|were|is|are|been|often|previously|recently)?\s*(asked|reported|seen|used)\s+(by|at|in|during)\b|\binterview(ed)?\s+(at|with)\b", re.I)


def clean_generated(items: list[GenQuestion], company: str, known: set[str], count: int) -> list[GenQuestion]:
    """Code (not the model) removes company claims and duplicates."""
    out, seen = [], set(known)
    for item in items:
        text = item.text.strip()
        if company and company.lower() in text.lower():
            continue
        if _COMPANY_CLAIM.search(text):
            continue
        h = _hash(text)
        if h in seen:
            continue
        seen.add(h)
        out.append(GenQuestion(text=text, difficulty=item.difficulty))
        if len(out) == count:
            break
    return out


@router.post("/sessions/{session_id}/generate", status_code=201)
def generate(session_id: uuid.UUID, body: GenIn, profile: StudentProfile = Depends(current_profile),
             db: Session = Depends(get_db), llm: LLMClient = Depends(get_llm_client)):
    session = _get(db, profile, session_id)
    known = set(db.scalars(select(InterviewQuestion.text_hash).where(*_visible(profile))))
    skills = [s.name for s in profile_service.list_items(db, profile, "skills")][:20]
    result = run_structured(
        db, profile.id, llm, "interview_generate", "v1",
        {"topic": body.topic, "count": body.count, "role": session.role, "level": session.level, "skills": skills}, GenOut)
    kept = clean_generated(result.questions, session.company, known, body.count)
    created = []
    for item in kept:
        q = InterviewQuestion(owner_profile_id=profile.id, text=item.text, text_hash=_hash(item.text), topic=body.topic,
                              difficulty=item.difficulty, provenance_type="AI_GENERATED",  # forced by code
                              role_tags=[], company=None)
        db.add(q)
        db.flush()
        db.add(QuestionSource(question_id=q.id, source_type="AI_GENERATED", title="AI-generated practice question",
                              reliability_note="Written by an AI model. It may be inaccurate and is not from any company."))
        db.add(SessionQuestion(session_id=session.id, question_id=q.id))
        created.append(q)
    if created:
        plan = {**session.plan, "days": [dict(d) for d in session.plan["days"]]}
        target = next((d for d in plan["days"] if d["topic"] == body.topic), plan["days"][-1] if plan["days"] else None)
        if target is None:
            plan["days"].append({"day": 1, "topic": body.topic, "question_ids": []})
            target = plan["days"][-1]
        target["question_ids"] = [*target["question_ids"], *(str(q.id) for q in created)]
        session.plan = plan
    db.commit()
    return session_out(db, session)
