"""Coding module service. Connectors are passed in so tests never hit the network."""
import datetime as dt
import uuid
from collections.abc import Callable
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.db.models.coding import CodingPlatformAccount, CodingPlatformSnapshot, Repository
from app.db.models.profile import Proposal, StudentProfile
from app.integrations.github import ConnectorError, GithubResult
from app.modules.profile import service as profile_service

PLATFORMS = ("GITHUB", "LEETCODE", "CODECHEF", "HACKERRANK")
API_PLATFORMS = ("GITHUB",)  # others are manual-only until a connector is verified
FRESH_API = dt.timedelta(hours=24)
FRESH_MANUAL = dt.timedelta(days=90)
KEEP_SNAPSHOTS = 5

Fetcher = Callable[[str], GithubResult]

_HTTP_FOR_CODE = {
    "NOT_FOUND": 404,
    "INVALID_USERNAME": 422,
    "RATE_LIMITED": 429,
}


def now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def _aware(value: dt.datetime | None) -> dt.datetime | None:
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=dt.timezone.utc)
    return value


def _connector_error(exc: ConnectorError) -> AppError:
    status = _HTTP_FOR_CODE.get(exc.code, 502)
    hint = " You can enter your stats manually instead." if status == 502 else ""
    return AppError(exc.code, exc.message + hint, status)


def _account(db: Session, profile: StudentProfile, platform: str) -> CodingPlatformAccount | None:
    return db.scalar(
        select(CodingPlatformAccount).where(
            CodingPlatformAccount.profile_id == profile.id,
            CodingPlatformAccount.platform == platform,
        )
    )


def _require_account(db, profile, platform) -> CodingPlatformAccount:
    account = _account(db, profile, platform)
    if account is None:
        raise AppError("NOT_FOUND", "That account is not connected.", 404)
    return account


def _latest(db: Session, account: CodingPlatformAccount) -> CodingPlatformSnapshot | None:
    return db.scalar(
        select(CodingPlatformSnapshot)
        .where(CodingPlatformSnapshot.account_id == account.id)
        .order_by(CodingPlatformSnapshot.fetched_at.desc())
        .limit(1)
    )


def _prune(db: Session, account_id: uuid.UUID) -> None:
    keep = db.scalars(
        select(CodingPlatformSnapshot.id)
        .where(CodingPlatformSnapshot.account_id == account_id)
        .order_by(CodingPlatformSnapshot.fetched_at.desc())
        .limit(KEEP_SNAPSHOTS)
    ).all()
    db.execute(
        delete(CodingPlatformSnapshot).where(
            CodingPlatformSnapshot.account_id == account_id,
            CodingPlatformSnapshot.id.not_in(keep),
        )
    )


def _store_github(
    db: Session, profile: StudentProfile, account: CodingPlatformAccount, result: GithubResult
) -> None:
    stamp = now()
    db.add(
        CodingPlatformSnapshot(
            account_id=account.id,
            fetched_at=stamp,
            source_method="OFFICIAL_API",
            status="OK",
            raw_payload=result.raw,
            normalized=result.normalized,
            is_manual=False,
        )
    )
    account.status = "OK"
    account.last_synced_at = stamp
    existing = {
        r.external_id: r
        for r in db.scalars(select(Repository).where(Repository.profile_id == profile.id))
    }
    seen = set()
    for data in result.repositories:
        seen.add(data["external_id"])
        pushed = data.get("pushed_at")
        values = {
            **data,
            "pushed_at": dt.datetime.fromisoformat(pushed.replace("Z", "+00:00"))
            if pushed
            else None,
            "fetched_at": stamp,
        }
        row = existing.get(data["external_id"])
        if row:
            for k, v in values.items():
                setattr(row, k, v)
        else:
            db.add(Repository(profile_id=profile.id, **values))
    for external_id, row in existing.items():
        if external_id not in seen:  # renamed, deleted or made private upstream
            db.delete(row)
    db.flush()
    _prune(db, account.id)


def connect_github(
    db: Session, profile: StudentProfile, username: str, fetch: Fetcher
) -> dict[str, Any]:
    try:
        result = fetch(username)
    except ConnectorError as exc:
        raise _connector_error(exc) from None
    account = _account(db, profile, "GITHUB")
    if account is None:
        account = CodingPlatformAccount(
            profile_id=profile.id,
            platform="GITHUB",
            username=result.normalized["username"],
            connection_method="API",
        )
        db.add(account)
        db.flush()
    else:
        account.username = result.normalized["username"]
        account.connection_method = "API"
    _store_github(db, profile, account, result)
    account.last_refresh_attempt_at = now()
    db.commit()
    return entry(db, account)


def refresh(
    db: Session,
    profile: StudentProfile,
    platform: str,
    fetch: Fetcher,
    cooldown: dt.timedelta,
) -> dict[str, Any]:
    account = _require_account(db, profile, platform)
    if account.connection_method != "API":
        raise AppError("BAD_REQUEST", "Manual accounts are updated by entering new stats.", 400)
    last = _aware(account.last_refresh_attempt_at)
    if last and now() - last < cooldown:
        wait = int((cooldown - (now() - last)).total_seconds())
        raise AppError(
            "RATE_LIMITED",
            f"Refreshed recently. Try again in {max(1, wait // 60 + 1)} minute(s).",
            429,
            {"retry_after_seconds": wait},
        )
    account.last_refresh_attempt_at = now()
    try:
        result = fetch(account.username)
    except ConnectorError as exc:
        db.commit()  # record the attempt so failures also respect the cooldown
        if _latest(db, account) is None:
            raise _connector_error(exc) from None
        # Keep the last good snapshot and tell the user it is stale.
        account.status = "STALE"
        db.commit()
        out = entry(db, account)
        out["warnings"] = [*out["warnings"], f"Refresh failed: {exc.message}"]
        return out
    _store_github(db, profile, account, result)
    db.commit()
    return entry(db, account)


def save_manual(
    db: Session,
    profile: StudentProfile,
    platform: str,
    username: str,
    metrics: dict[str, int],
) -> dict[str, Any]:
    account = _account(db, profile, platform)
    if account is None:
        account = CodingPlatformAccount(
            profile_id=profile.id,
            platform=platform,
            username=username,
            connection_method="MANUAL",
        )
        db.add(account)
        db.flush()
    elif account.connection_method == "API":
        raise AppError(
            "CONFLICT", "This account is connected through its API. Disconnect it first.", 409
        )
    account.username = username
    stamp = now()
    db.add(
        CodingPlatformSnapshot(
            account_id=account.id,
            fetched_at=stamp,
            source_method="MANUAL",
            status="OK",
            raw_payload=None,
            normalized={
                "platform": platform,
                "username": username,
                "metrics": {k: {"value": v, "available": True} for k, v in metrics.items()},
                "warnings": [],
            },
            is_manual=True,
        )
    )
    account.status = "OK"
    account.last_synced_at = stamp
    db.flush()
    _prune(db, account.id)
    db.commit()
    return entry(db, account)


def disconnect(db: Session, profile: StudentProfile, platform: str, delete_data: bool) -> None:
    account = _require_account(db, profile, platform)
    db.delete(account)  # snapshots cascade
    if platform == "GITHUB" and delete_data:
        db.execute(delete(Repository).where(Repository.profile_id == profile.id))
    db.commit()


def entry(db: Session, account: CodingPlatformAccount) -> dict[str, Any]:
    snap = _latest(db, account)
    warnings: list[str] = []
    status = account.status
    fetched = _aware(snap.fetched_at) if snap else None
    if snap and fetched:
        age = now() - fetched
        limit = FRESH_MANUAL if snap.is_manual else FRESH_API
        if age >= limit and status == "OK":
            status = "STALE"
        if status == "STALE" and not snap.is_manual:
            warnings.append("Data is more than 24 hours old. Refresh to update it.")
        if snap.is_manual and age >= FRESH_MANUAL:
            warnings.append("You entered these stats more than 90 days ago.")
        warnings += list(snap.normalized.get("warnings", []))
    return {
        "platform": account.platform,
        "connected": True,
        "username": account.username,
        "source_method": snap.source_method if snap else None,
        "status": status,
        "fetched_at": fetched.isoformat() if fetched else None,
        "metrics": snap.normalized.get("metrics", {}) if snap else {},
        "languages": snap.normalized.get("languages") if snap else None,
        "profile_url": snap.normalized.get("profile_url") if snap else None,
        "warnings": warnings,
    }


def dashboard(db: Session, profile: StudentProfile) -> list[dict[str, Any]]:
    accounts = {
        a.platform: a
        for a in db.scalars(
            select(CodingPlatformAccount).where(CodingPlatformAccount.profile_id == profile.id)
        )
    }
    out = []
    for platform in PLATFORMS:
        if platform in accounts:
            out.append(entry(db, accounts[platform]))
        else:
            out.append(
                {
                    "platform": platform,
                    "connected": False,
                    "manual_only": platform not in API_PLATFORMS,
                }
            )
    return out


def list_repositories(db: Session, profile: StudentProfile) -> list[Repository]:
    return list(
        db.scalars(
            select(Repository)
            .where(Repository.profile_id == profile.id)
            .order_by(Repository.pushed_at.desc())
        )
    )


def propose_project(db: Session, profile: StudentProfile, repo_id: uuid.UUID) -> Proposal:
    repo = db.scalar(
        select(Repository).where(Repository.id == repo_id, Repository.profile_id == profile.id)
    )
    if repo is None:
        raise AppError("NOT_FOUND", "That repository was not found.", 404)
    pending = [
        p
        for p in profile_service.list_proposals(db, profile)
        if p.section == "projects" and repo.url in p.payload.get("links", [])
    ]
    if pending:
        return pending[0]
    tech = [t for t in [repo.language, *(repo.topics or [])] if t][:20]
    payload = {
        "title": repo.full_name.split("/")[-1][:200],
        "description": (repo.description or None),
        "tech": tech,
        "links": [repo.url],
    }
    # Contribution and outcomes are deliberately left for the user to write.
    return profile_service.create_proposal(
        db, profile, "projects", "create", payload, source="PLATFORM_VERIFIED"
    )
