import datetime as dt
import uuid
from collections.abc import Callable
from typing import Any, Literal

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import AppError
from app.core.ratelimit import limit
from app.db.models.profile import StudentProfile
from app.db.session import get_db
from app.integrations import github, platforms
from app.modules.coding import service
from app.modules.profile.router import current_profile
from app.modules.profile.schemas import ProposalOut

router = APIRouter(prefix="/coding", tags=["coding"])

Platform = Literal["GITHUB", "LEETCODE", "CODECHEF", "CODEFORCES", "HACKERRANK"]
USERNAME = r"^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$"


def get_github_fetcher() -> Callable[[str], github.GithubResult]:
    token = get_settings().github_token
    return lambda username: github.fetch(username, token=token)


def get_platform_fetcher() -> Callable[[str, str], platforms.PlatformResult]:
    """LeetCode, CodeChef, Codeforces and HackerRank connectors. Tests override this so nothing reaches the network."""
    return platforms.fetch


def get_cooldown() -> dt.timedelta:
    return dt.timedelta(minutes=get_settings().refresh_cooldown_minutes)


class ConnectBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    username: str = Field(pattern=USERNAME)


class ManualBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    username: str = Field(pattern=USERNAME)
    problems_solved_total: int | None = Field(default=None, ge=0, le=20000)
    rating_current: int | None = Field(default=None, ge=0, le=5000)
    rating_max: int | None = Field(default=None, ge=0, le=5000)
    contests_count: int | None = Field(default=None, ge=0, le=5000)
    stars: int | None = Field(default=None, ge=0, le=7)

    @model_validator(mode="after")
    def at_least_one_metric(self) -> "ManualBody":
        values = self.model_dump(exclude={"username"})
        if all(v is None for v in values.values()):
            raise ValueError("Enter at least one stat.")
        if (
            self.rating_current is not None
            and self.rating_max is not None
            and self.rating_max < self.rating_current
        ):
            raise ValueError("Max rating cannot be lower than current rating.")
        return self


@router.get("/dashboard")
def get_dashboard(
    profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)
) -> list[dict[str, Any]]:
    return service.dashboard(db, profile)


@router.put("/accounts/{platform}", dependencies=[Depends(limit("platform", 20, 60))])
def connect_account(
    platform: Platform,
    body: ConnectBody,
    profile: StudentProfile = Depends(current_profile),
    db: Session = Depends(get_db),
    fetch=Depends(get_github_fetcher),
    platform_fetch=Depends(get_platform_fetcher),
):
    if platform not in service.API_PLATFORMS:
        raise AppError(
            "MANUAL_ONLY",
            f"{platform.title()} has no verified integration yet. Enter your stats manually.",
            400,
        )
    if platform == "GITHUB":
        return service.connect_github(db, profile, body.username, fetch)
    return service.connect_platform(db, profile, platform, body.username, platform_fetch)


@router.put("/accounts/{platform}/manual")
def manual_stats(
    platform: Platform,
    body: ManualBody,
    profile: StudentProfile = Depends(current_profile),
    db: Session = Depends(get_db),
):
    metrics = {
        k: v for k, v in body.model_dump(exclude={"username"}).items() if v is not None
    }
    return service.save_manual(db, profile, platform, body.username, metrics)


@router.post("/accounts/{platform}/refresh")
def refresh_account(
    platform: Platform,
    profile: StudentProfile = Depends(current_profile),
    db: Session = Depends(get_db),
    fetch=Depends(get_github_fetcher),
    platform_fetch=Depends(get_platform_fetcher),
    cooldown: dt.timedelta = Depends(get_cooldown),
):
    username_fetch = fetch if platform == "GITHUB" else (lambda username: platform_fetch(platform, username))
    return service.refresh(db, profile, platform, username_fetch, cooldown)


@router.delete("/accounts/{platform}", status_code=204)
def disconnect_account(
    platform: Platform,
    delete_data: bool = False,
    profile: StudentProfile = Depends(current_profile),
    db: Session = Depends(get_db),
):
    service.disconnect(db, profile, platform, delete_data)
    return Response(status_code=204)


@router.get("/repositories")
def get_repositories(
    profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)
) -> list[dict[str, Any]]:
    return [
        {
            "id": str(r.id),
            "full_name": r.full_name,
            "description": r.description,
            "url": r.url,
            "language": r.language,
            "stars": r.stars,
            "topics": r.topics,
            "pushed_at": r.pushed_at.isoformat() if r.pushed_at else None,
            "is_fork": r.is_fork,
            "is_archived": r.is_archived,
            "readme_excerpt": (r.readme or "")[:400] or None,
            "fetched_at": r.fetched_at.isoformat(),
        }
        for r in service.list_repositories(db, profile)
    ]


@router.post(
    "/repositories/{repo_id}/propose-project", response_model=ProposalOut, status_code=201
)
def propose_project(
    repo_id: uuid.UUID,
    profile: StudentProfile = Depends(current_profile),
    db: Session = Depends(get_db),
):
    return service.propose_project(db, profile, repo_id)
