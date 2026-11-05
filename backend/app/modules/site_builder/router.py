"""Portfolio Site Builder API: claim a handle, build/enrich a portfolio, publish it as a public page.

Mounted at /api/v1/portfolio-site. Separate from the existing /api/v1/portfolio draft+export endpoints,
which are unchanged.
"""
import asyncio
import re
import time
from collections import defaultdict, deque
from typing import Any

from fastapi import APIRouter, Depends, File, Request, UploadFile
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.ai.llm import LLMClient, get_llm_client
from app.core.errors import AppError
from app.core.ratelimit import limit
from app.core.config import get_settings
from app.db.models.profile import StudentProfile
from app.db.models.site import UserPortfolio
from app.db.session import get_db
from app.modules.profile.router import current_profile
from app.modules.site_builder import enrichment, parser, schemas

router = APIRouter(prefix="/portfolio-site", tags=["portfolio-site"])

HANDLE_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$")
RESERVED = {
    "admin", "api", "app", "www", "p", "demo", "static", "login", "settings", "profile", "portfolio",
    "portfolio-site", "resume", "coding", "prep", "support", "help", "about", "terms", "privacy", "root",
}

# --- a tiny per-IP limiter for the one unauthenticated endpoint ---------------------------------------
_public_hits: dict[str, deque[float]] = defaultdict(deque)


def reset_public_limits() -> None:
    _public_hits.clear()


def _public_limit(request: Request) -> None:
    ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    window = _public_hits[ip]
    while window and now - window[0] > 60:
        window.popleft()
    if len(window) >= 120:
        raise AppError("RATE_LIMITED", "Too many requests. Please wait a moment.", 429)
    window.append(now)


# --- helpers -------------------------------------------------------------------------------------------

def _problem_with(handle: str) -> str | None:
    if not HANDLE_RE.match(handle):
        return "Use 3 to 30 characters: lowercase letters, numbers and hyphens (not at the start or end)."
    if handle in RESERVED:
        return "That name is reserved."
    return None


def _row_for(db: Session, user_id) -> UserPortfolio | None:
    return db.scalar(select(UserPortfolio).where(UserPortfolio.user_id == user_id))


def _need_row(db: Session, profile: StudentProfile) -> UserPortfolio:
    row = _row_for(db, profile.user_id)
    if row is None:
        raise AppError("NO_PORTFOLIO", "Claim a handle first to create your portfolio.", 404)
    return row


def to_data(row: UserPortfolio) -> dict[str, Any]:
    """Row -> the camelCase PortfolioData dict. `config` always comes from the columns."""
    body = dict(row.portfolio_data or {})
    body["config"] = {
        "handle": row.handle, "templateId": row.template_id, "themeMode": row.theme_mode, "mascotId": row.mascot_id,
        "accentColor": row.accent_color, "isPublished": row.is_published,
        "showCodingStats": row.show_coding_stats, "showMascot": row.show_mascot,
    }
    return schemas.PortfolioData.model_validate(body).model_dump(by_alias=True, mode="json", exclude_none=True)


def _store(row: UserPortfolio, data: dict[str, Any]) -> None:
    """Writes a PortfolioData dict into the row (config -> columns, the rest -> JSON)."""
    parsed = schemas.PortfolioData.model_validate(data)
    c = parsed.config
    row.template_id, row.theme_mode, row.mascot_id = c.template_id, c.theme_mode, c.mascot_id
    row.accent_color, row.show_coding_stats, row.show_mascot = c.accent_color, c.show_coding_stats, c.show_mascot
    row.is_published = c.is_published
    body = parsed.model_dump(by_alias=True, mode="json", exclude_none=True)
    body.pop("config")
    row.portfolio_data = body


def _run(coro):
    # Sync endpoints run in a worker thread, so there is no running loop to conflict with.
    return asyncio.run(coro)


def _handles_from(data: dict[str, Any], extra: dict[str, str | None] | None = None) -> dict[str, str | None]:
    stats = data.get("codingStats") or {}
    found = {k: (stats.get(k) or {}).get("username") for k in ("github", "leetcode", "codechef", "codeforces")}
    return {**found, **{k: v for k, v in (extra or {}).items() if v}}


# --- endpoints -----------------------------------------------------------------------------------------

@router.get("/check-handle", response_model=schemas.HandleCheck, response_model_by_alias=True, response_model_exclude_none=True,
            dependencies=[Depends(limit("site-check", 60, 60))])
def check_handle(handle: str, profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)):
    handle = handle.strip().lower()
    problem = _problem_with(handle)
    if problem:
        return schemas.HandleCheck(available=False, handle=handle, message=problem)
    owner = db.scalar(select(UserPortfolio.user_id).where(UserPortfolio.handle == handle))
    if owner is not None and owner != profile.user_id:
        return schemas.HandleCheck(available=False, handle=handle, message="This username is already taken.")
    return schemas.HandleCheck(available=True, handle=handle, message="Looks good!")


@router.post("/claim-handle", response_model=schemas.PortfolioData, response_model_by_alias=True, response_model_exclude_none=True,
             dependencies=[Depends(limit("site-claim", 10, 3600))])
def claim_handle(body: schemas.ClaimIn, profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)):
    handle = body.handle.strip().lower()
    if not body.accepted_terms:
        raise AppError("TERMS_REQUIRED", "Please accept the Terms and Privacy Policy to continue.", 422)
    problem = _problem_with(handle)
    if problem:
        raise AppError("INVALID_HANDLE", problem, 422)

    row = _row_for(db, profile.user_id)
    if row is None:
        row = UserPortfolio(user_id=profile.user_id, handle=handle)
        # Start from what the user already told us. Nothing is invented: coding stats stay empty.
        email = profile.user.email if profile.user else ""
        row.portfolio_data = {
            "basics": {
                "fullName": profile.display_name or "", "headline": profile.headline or "",
                "shortBio": (profile.summary or "")[:600], "email": email or "", "location": profile.location_pref or "",
            },
        }
        db.add(row)
    else:
        row.handle = handle
    try:
        db.commit()
    except IntegrityError:  # someone claimed it between the check and now
        db.rollback()
        raise AppError("HANDLE_TAKEN", "This username is already taken.", 409) from None
    return to_data(row)


@router.get("/me", response_model=schemas.PortfolioData, response_model_by_alias=True, response_model_exclude_none=True)
def get_mine(profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)):
    return to_data(_need_row(db, profile))


@router.put("/me", response_model=schemas.PortfolioData, response_model_by_alias=True, response_model_exclude_none=True,
            dependencies=[Depends(limit("site-save", 60, 3600))])
def save_mine(body: schemas.PortfolioData, profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)):
    row = _need_row(db, profile)
    incoming = body.model_dump(by_alias=True, mode="json", exclude_none=True)
    incoming["config"]["handle"] = row.handle  # the handle changes only through claim-handle
    _store(row, incoming)
    db.commit()
    return to_data(row)


@router.post("/sync-stats", response_model=schemas.SiteResult, response_model_by_alias=True, response_model_exclude_none=True,
             dependencies=[Depends(limit("site-sync", 20, 3600))])
def sync_stats(body: schemas.SyncIn, profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)):
    row = _need_row(db, profile)
    data = to_data(row)
    handles = {k: getattr(body, k) for k in ("github", "leetcode", "codechef", "codeforces")}
    data, warnings = _run(enrichment.enrich_portfolio(data, handles))
    for key, url in (("github", "https://github.com/{}"), ("leetcode", "https://leetcode.com/u/{}/"),
                     ("codechef", "https://www.codechef.com/users/{}"), ("codeforces", "https://codeforces.com/profile/{}")):
        name = enrichment.valid_username(handles.get(key))
        if name and data["codingStats"].get(key) and not data["basics"]["socials"].get(key):
            data["basics"]["socials"][key] = url.format(name)
    _store(row, data)
    db.commit()
    return schemas.SiteResult(data=to_data(row), warnings=warnings)


@router.post("/upload-resume", response_model=schemas.SiteResult, response_model_by_alias=True, response_model_exclude_none=True,
             dependencies=[Depends(limit("site-upload", 10, 3600))])
def upload_resume(
    file: UploadFile = File(...),
    profile: StudentProfile = Depends(current_profile),
    db: Session = Depends(get_db),
    llm: LLMClient = Depends(get_llm_client),
):
    row = _need_row(db, profile)
    max_bytes = get_settings().max_upload_mb * 1024 * 1024
    raw = file.file.read(max_bytes + 1)
    if len(raw) > max_bytes:
        raise AppError("PAYLOAD_TOO_LARGE", f"Files must be {get_settings().max_upload_mb} MB or smaller.", 413)
    if not raw.startswith(b"%PDF-") or not (file.filename or "").lower().endswith(".pdf"):
        raise AppError("UNSUPPORTED_MEDIA_TYPE", "Upload a PDF file.", 415)
    try:
        parsed = parser.parse_resume(raw, llm)
    except ValueError as exc:
        raise AppError("RESUME_UNREADABLE", str(exc), 422) from None

    data = to_data(row)
    handles = parsed.pop("handles")
    # Replace the content sections with what the resume says, but never wipe the visual choices or
    # anything the resume did not contain (e.g. a resume URL or avatar you already set).
    old_basics = data["basics"]
    for key in ("projects", "experience", "education", "achievements", "skills"):
        data[key] = parsed[key]
    merged = {**old_basics, **{k: v for k, v in parsed["basics"].items() if v not in ("", None, {})}}
    merged["socials"] = {**old_basics.get("socials", {}), **parsed["basics"].get("socials", {})}
    for keep in ("avatarUrl", "resumeUrl"):
        merged[keep] = old_basics.get(keep)
    data["basics"] = merged
    data, warnings = _run(enrichment.enrich_portfolio(data, _handles_from(data, handles)))
    if not (parsed["projects"] or parsed["experience"] or parsed["education"]):
        warnings.append("Only basic details could be read from this PDF. Fill in the rest under Edit Data.")
    _store(row, data)
    db.commit()
    return schemas.SiteResult(data=to_data(row), warnings=warnings)


@router.get("/public/{handle}", response_model=schemas.PortfolioData, response_model_by_alias=True, response_model_exclude_none=True,
            dependencies=[Depends(_public_limit)])
def public_portfolio(handle: str, db: Session = Depends(get_db)):
    """No sign-in. Only published portfolios are served, and the phone number is never included."""
    row = db.scalar(select(UserPortfolio).where(func.lower(UserPortfolio.handle) == handle.strip().lower()))
    if row is None or not row.is_published:
        raise AppError("NOT_FOUND", "This portfolio does not exist or is not published.", 404)
    db.execute(update(UserPortfolio).where(UserPortfolio.id == row.id).values(views_count=UserPortfolio.views_count + 1))
    db.commit()
    data = to_data(row)
    data["basics"].pop("phone", None)
    return data
