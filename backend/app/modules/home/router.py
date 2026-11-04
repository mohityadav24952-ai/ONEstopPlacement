"""Home summary: reads each module's data and proposes next actions.
A failure in one module's summary never blocks the others."""
import logging
from collections.abc import Callable
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models.coding import CodingPlatformAccount, Repository
from app.db.models.interview import PreparationSession, SessionQuestion
from app.db.models.portfolio import Portfolio, PortfolioVersion
from app.db.models.profile import Proposal, StudentProfile
from app.db.models.resume import ResumeVersion
from app.db.session import get_db
from app.modules.coding import service as coding_service
from app.modules.profile import service as profile_service
from app.modules.profile.router import current_profile
from app.modules.resume.facts import profile_hash

logger = logging.getLogger("app.home")
router = APIRouter(tags=["home"])


def _safe(name: str, fn: Callable[[], dict[str, Any]]) -> dict[str, Any] | None:
    try:
        return fn()
    except Exception:  # one module failing must not take Home down
        logger.exception("Home summary failed for %s", name)
        return None


def _count(db: Session, stmt) -> int:
    return db.scalar(select(func.count()).select_from(stmt.subquery())) or 0


def profile_summary(db: Session, profile: StudentProfile) -> dict[str, Any]:
    comp = profile_service.completeness(db, profile)
    pending = _count(db, select(Proposal.id).where(Proposal.profile_id == profile.id, Proposal.status == "PENDING"))
    return {"percent": comp["percent"], "pending_proposals": pending}


def coding_summary(db: Session, profile: StudentProfile) -> dict[str, Any]:
    entries = [e for e in coding_service.dashboard(db, profile) if e["connected"]]
    return {
        "connected": len(entries),
        "stale": sum(1 for e in entries if e["status"] != "OK"),
        "repositories": _count(db, select(Repository.id).where(Repository.profile_id == profile.id)),
    }


def resume_summary(db: Session, profile: StudentProfile) -> dict[str, Any]:
    h = profile_hash(profile)
    versions = list(db.scalars(select(ResumeVersion).where(ResumeVersion.profile_id == profile.id)))
    return {
        "drafts": sum(v.status == "DRAFT" for v in versions),
        "approved": sum(v.status == "APPROVED" for v in versions),
        "stale_approved": sum(v.status == "APPROVED" and v.profile_version_hash != h for v in versions),
    }


def interview_summary(db: Session, profile: StudentProfile) -> dict[str, Any]:
    sessions = _count(db, select(PreparationSession.id).where(PreparationSession.profile_id == profile.id))
    total = _count(db, select(SessionQuestion.id).join(PreparationSession).where(PreparationSession.profile_id == profile.id))
    done = _count(db, select(SessionQuestion.id).join(PreparationSession).where(
        PreparationSession.profile_id == profile.id, SessionQuestion.state == "DONE"))
    return {"sessions": sessions, "percent_done": round(100 * done / total) if total else 0}


def portfolio_summary(db: Session, profile: StudentProfile) -> dict[str, Any]:
    h = profile_hash(profile)
    versions = list(db.scalars(select(PortfolioVersion).where(PortfolioVersion.profile_id == profile.id)))
    return {
        "portfolios": _count(db, select(Portfolio.id).where(Portfolio.profile_id == profile.id)),
        "approved": sum(v.status == "APPROVED" for v in versions),
        "stale_approved": sum(v.status == "APPROVED" and v.profile_version_hash != h for v in versions),
    }


def next_actions(s: dict[str, dict[str, Any] | None]) -> list[dict[str, str]]:
    """Deterministic rules, in priority order. A module with no summary is skipped."""
    acts: list[dict[str, str]] = []

    def add(id_, title, description, href):
        acts.append({"id": id_, "title": title, "description": description, "href": href})

    p, c, r, i, f = (s.get(k) for k in ("profile", "coding", "resume", "interview", "portfolio"))
    if p and p["percent"] < 50:
        add("complete-profile", "Complete your profile", "Every module uses it. Add your basics, education, skills and a project.", "/profile")
    if p and p["pending_proposals"]:
        add("review-suggestions", f"Review {p['pending_proposals']} suggested change(s)", "Nothing is added to your profile until you approve it.", "/profile")
    if c and c["connected"] == 0:
        add("connect-github", "Connect your coding profiles", "Add GitHub, or enter your LeetCode, CodeChef and HackerRank stats by hand.", "/coding")
    elif c and c["stale"]:
        add("refresh-coding", "Refresh stale coding stats", "Some coding data is out of date.", "/coding")
    if r and r["drafts"] + r["approved"] == 0:
        add("create-resume", "Create your first resume", "Tailor it to a job description using only facts from your profile.", "/resume")
    elif r and r["stale_approved"]:
        add("update-resume", "Your approved resume is out of date", "Your profile changed after it was approved. Create a new draft.", "/resume")
    if i and i["sessions"] == 0:
        add("create-plan", "Build an interview plan", "A day-by-day plan with a source label on every question.", "/prep")
    if f and f["portfolios"] == 0:
        add("create-portfolio", "Create a portfolio", "Generate a static site from your approved profile.", "/portfolio")
    elif f and f["stale_approved"]:
        add("update-portfolio", "Your approved portfolio is out of date", "Create a new draft to include recent profile changes.", "/portfolio")
    return acts[:4]


@router.get("/home")
def home(profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)):
    summaries = {
        "profile": _safe("profile", lambda: profile_summary(db, profile)),
        "coding": _safe("coding", lambda: coding_summary(db, profile)),
        "resume": _safe("resume", lambda: resume_summary(db, profile)),
        "interview": _safe("interview", lambda: interview_summary(db, profile)),
        "portfolio": _safe("portfolio", lambda: portfolio_summary(db, profile)),
    }
    unavailable = [k for k, v in summaries.items() if v is None]
    return {**summaries, "unavailable": unavailable, "next_actions": next_actions(summaries)}
