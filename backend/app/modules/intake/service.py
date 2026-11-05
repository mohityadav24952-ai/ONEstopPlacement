"""Approval queue for data found in a user's first parsed resume.

On the FIRST successful parse this finds coding-platform links (LeetCode, CodeChef, HackerRank, GitHub)
and basic profile details, and parks them as pending requests. Nothing is connected or written until the
user approves. Approve all / Reject all act on this queue AND on the pending resume-section proposals that
the existing import step creates, so the user decides once instead of on dozens of individual rows.
"""
import io
import logging
import re
import zipfile
from collections.abc import Callable
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.db.models.coding import CodingPlatformAccount
from app.db.models.intake import IntakeRequest
from app.db.models.profile import StudentProfile
from app.modules.coding import service as coding_service
from app.modules.profile import service as profile_service
from app.modules.site_builder import parser as link_parser

logger = logging.getLogger("app.intake")

USERNAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$")
_NOT_USERS = {
    "leetcode": {"problems", "contest", "explore", "discuss", "tag", "company", "studyplan", "assessment", "store", "interview", "u", "accounts", "problemset", "list"},
    "hackerrank": {"domains", "challenges", "contests", "certificates", "leaderboard", "prepare", "interview", "skills-verification", "work", "blog", "profile", "dashboard", "login", "signup", "tests"},
    "github": {"features", "about", "pricing", "login", "orgs", "topics", "marketplace", "sponsors", "settings", "explore"},
}
_PATTERNS = {
    "LEETCODE": (r"leetcode\.(?:com|cn)/(?:u/)?([A-Za-z0-9_.-]+)/?(?:$|[?#])", "leetcode"),
    "CODECHEF": (r"codechef\.com/users/([A-Za-z0-9_.]+)", None),
    "HACKERRANK": (r"hackerrank\.com/(?:profile/)?([A-Za-z0-9_.-]+)/?(?:$|[?#])", "hackerrank"),
    "GITHUB": (r"github\.com/([A-Za-z0-9-]+)/?(?:$|[?#])", "github"),
}
LABELS = {"LEETCODE": "LeetCode", "CODECHEF": "CodeChef", "HACKERRANK": "HackerRank", "GITHUB": "GitHub"}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _docx_links(data: bytes) -> list[str]:
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            rels = z.read("word/_rels/document.xml.rels").decode("utf-8", "ignore")
    except (KeyError, zipfile.BadZipFile):
        return []
    return re.findall(r'Target="(https?://[^"]+)"[^>]*TargetMode="External"', rels)


def collect_links(mime: str, data: bytes, text: str) -> list[str]:
    """Every URL in the resume: hidden hyperlinks plus URLs printed in the text, with bare domains normalised."""
    links: list[str] = []
    if mime == "application/pdf":
        try:
            links += link_parser.extract_pdf(data)[1]
        except ValueError:
            pass
    else:
        links += _docx_links(data)
    links += re.findall(r"https?://[^\s<>\")\]]+", text)
    links += ["https://" + m for m in link_parser._BARE.findall(text)]
    links += ["https://" + m for m in re.findall(r"(?<![/@\w.])((?:www\.)?hackerrank\.com/[^\s,;)\]\"]+)", text, re.I)]
    seen: set[str] = set()
    return [u.rstrip(".,;") for u in links if not (u in seen or seen.add(u))]


def find_accounts(links: list[str]) -> dict[str, str]:
    found: dict[str, str] = {}
    for platform, (pattern, banned_key) in _PATTERNS.items():
        for url in links:
            m = re.search(pattern, url, re.I)
            if not m:
                continue
            name = m.group(1)
            if name.lower() in _NOT_USERS.get(banned_key or "", set()) or not USERNAME.match(name):
                continue
            found.setdefault(platform, name)
            break
    return found


def _profile_fields(profile: StudentProfile, text: str, links: list[str]) -> list[dict[str, str]]:
    """Only fields the user has not filled in yet. Existing values are never proposed for replacement."""
    heur = link_parser.heuristic_parse(text, links)
    out = []
    name = heur["basics"].get("fullName")
    if name and not profile.display_name:
        out.append({"field": "display_name", "label": "Name", "value": name})
    years = [int(e["endYear"]) for e in heur.get("education", []) if str(e.get("endYear", "")).isdigit()]
    if years and not profile.graduation_year and 1990 <= max(years) <= 2100:
        out.append({"field": "graduation_year", "label": "Graduation year", "value": str(max(years))})
    return out


def on_first_parse(db: Session, profile: StudentProfile, doc, text: str, data: bytes) -> dict[str, int]:
    """Creates pending requests the first time a resume is parsed. Never raises: parsing must not fail because of this."""
    try:
        already = db.scalar(select(func.count()).select_from(IntakeRequest).where(IntakeRequest.profile_id == profile.id))
        if already:
            return {"created": 0}
        links = collect_links(doc.mime_type, data, text)
        connected = set(db.scalars(select(CodingPlatformAccount.platform).where(CodingPlatformAccount.profile_id == profile.id)))
        created = 0
        for platform, username in find_accounts(links).items():
            if platform in connected:
                continue
            db.add(IntakeRequest(profile_id=profile.id, document_id=doc.id, kind="CODING_ACCOUNT",
                                 payload={"platform": platform, "username": username, "label": LABELS[platform]}))
            created += 1
        for field in _profile_fields(profile, text, links):
            db.add(IntakeRequest(profile_id=profile.id, document_id=doc.id, kind="PROFILE_FIELD", payload=field))
            created += 1
        if not created:
            # Remember that the first parse happened, so a later parse is not treated as the first one.
            db.add(IntakeRequest(profile_id=profile.id, document_id=doc.id, kind="PROFILE_FIELD", payload={}, status="REJECTED",
                                 message="Nothing found", decided_at=_now()))
        db.commit()
        return {"created": created}
    except Exception:  # noqa: BLE001
        logger.exception("intake extraction failed")
        db.rollback()
        return {"created": 0}


# ---- reading ---------------------------------------------------------------------------------------

def request_out(r: IntakeRequest) -> dict[str, Any]:
    return {"id": str(r.id), "kind": r.kind, "payload": r.payload, "status": r.status, "message": r.message}


def pending_requests(db: Session, profile: StudentProfile) -> list[IntakeRequest]:
    return list(db.scalars(
        select(IntakeRequest).where(IntakeRequest.profile_id == profile.id, IntakeRequest.status.in_(("PENDING", "FAILED")))
        .order_by(IntakeRequest.created_at)
    ))


def _get(db: Session, profile: StudentProfile, request_id) -> IntakeRequest:
    r = db.scalar(select(IntakeRequest).where(IntakeRequest.id == request_id, IntakeRequest.profile_id == profile.id))
    if r is None:
        raise AppError("NOT_FOUND", "That request was not found.", 404)
    return r


# ---- deciding --------------------------------------------------------------------------------------

def _apply(db: Session, profile: StudentProfile, r: IntakeRequest, github_fetch: Callable, platform_fetch: Callable) -> None:
    p = r.payload
    if r.kind == "CODING_ACCOUNT":
        if p["platform"] == "GITHUB":
            coding_service.connect_github(db, profile, p["username"], github_fetch)
        else:
            coding_service.connect_platform(db, profile, p["platform"], p["username"], platform_fetch)
    elif r.kind == "PROFILE_FIELD":
        from app.modules.profile import schemas

        value: Any = int(p["value"]) if p["field"] == "graduation_year" else p["value"]
        profile_service.update_profile(db, profile, schemas.ProfileUpdate(expected_version=profile.version, **{p["field"]: value}))


def approve_request(db, profile, r: IntakeRequest, github_fetch, platform_fetch) -> IntakeRequest:
    if r.status not in ("PENDING", "FAILED"):
        raise AppError("CONFLICT", "This request was already decided.", 409)
    try:
        _apply(db, profile, r, github_fetch, platform_fetch)
        r.status, r.message = "APPROVED", None
    except AppError as exc:
        db.rollback()
        r = _get(db, profile, r.id)
        r.status, r.message = "FAILED", exc.message[:300]  # stays in the list so the user can retry or reject
    r.decided_at = _now()
    db.commit()
    return r


def reject_request(db, profile, r: IntakeRequest) -> IntakeRequest:
    if r.status not in ("PENDING", "FAILED"):
        raise AppError("CONFLICT", "This request was already decided.", 409)
    r.status, r.decided_at = "REJECTED", _now()
    db.commit()
    return r


def approve_all(db, profile, github_fetch, platform_fetch) -> dict[str, Any]:
    approved = failed = 0
    for r in pending_requests(db, profile):
        r = approve_request(db, profile, r, github_fetch, platform_fetch)
        approved += r.status == "APPROVED"
        failed += r.status == "FAILED"
    proposals_ok = proposals_skipped = 0
    for pr in profile_service.list_proposals(db, profile):
        try:
            profile_service.approve_proposal(db, profile, pr.id)
            proposals_ok += 1
        except AppError:
            db.rollback()
            proposals_skipped += 1
    return {"approved": approved + proposals_ok, "failed": failed, "skipped": proposals_skipped}


def reject_all(db, profile) -> dict[str, Any]:
    n = 0
    for r in pending_requests(db, profile):
        reject_request(db, profile, r)
        n += 1
    for pr in profile_service.list_proposals(db, profile):
        profile_service.reject_proposal(db, profile, pr.id)
        n += 1
    return {"rejected": n}
