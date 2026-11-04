import uuid
import datetime as dt
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator



def _clean(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    return value or None


def _https(value: str | None) -> str | None:
    value = _clean(value)
    if value is not None and not value.lower().startswith("https://"):
        raise ValueError("Links must start with https://")
    return value


class _Strict(BaseModel):
    # Unknown fields (e.g. user_id, verification_state) are rejected, not ignored.
    model_config = ConfigDict(extra="forbid")


class ProvenanceOut(BaseModel):
    source_type: str
    verification_state: str


# ---- Profile root -------------------------------------------------------
class ProfileUpdate(_Strict):
    expected_version: int = Field(ge=1)
    display_name: str | None = Field(default=None, max_length=120)
    headline: str | None = Field(default=None, max_length=200)
    target_roles: list[Annotated[str, Field(min_length=1, max_length=80)]] | None = Field(
        default=None, max_length=10
    )
    graduation_year: int | None = Field(default=None, ge=1990, le=2100)
    location_pref: str | None = Field(default=None, max_length=120)
    summary: str | None = Field(default=None, max_length=2000)


class ProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    display_name: str | None
    headline: str | None
    target_roles: list[str]
    graduation_year: int | None
    location_pref: str | None
    summary: str | None
    version: int


# ---- Sections -----------------------------------------------------------
class EducationIn(_Strict):
    institution: str = Field(min_length=1, max_length=200)
    degree: str | None = Field(default=None, max_length=200)
    field: str | None = Field(default=None, max_length=200)
    start_date: dt.date | None = None
    end_date: dt.date | None = None
    grade: str | None = Field(default=None, max_length=50)


class ExperienceIn(_Strict):
    organization: str = Field(min_length=1, max_length=200)
    title: str = Field(min_length=1, max_length=200)
    start_date: dt.date | None = None
    end_date: dt.date | None = None
    description_points: list[Annotated[str, Field(min_length=1, max_length=500)]] = Field(
        default_factory=list, max_length=12
    )


class AchievementIn(_Strict):
    type: Literal["AWARD", "CERTIFICATION", "COMPETITION", "OTHER"] = "OTHER"
    title: str = Field(min_length=1, max_length=200)
    issuer: str | None = Field(default=None, max_length=200)
    date: dt.date | None = None
    url: str | None = Field(default=None, max_length=500)

    @field_validator("url")
    @classmethod
    def url_https(cls, v: str | None) -> str | None:
        return _https(v)


class SkillIn(_Strict):
    name: str = Field(min_length=1, max_length=100)
    category: str | None = Field(default=None, max_length=50)
    level: Literal["BEGINNER", "INTERMEDIATE", "ADVANCED"] | None = None


class ProjectIn(_Strict):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    tech: list[Annotated[str, Field(min_length=1, max_length=50)]] = Field(
        default_factory=list, max_length=20
    )
    links: list[Annotated[str, Field(max_length=500)]] = Field(
        default_factory=list, max_length=5
    )
    contribution: str | None = Field(default=None, max_length=2000)
    outcomes: list[Annotated[str, Field(min_length=1, max_length=300)]] = Field(
        default_factory=list, max_length=10
    )

    @field_validator("links")
    @classmethod
    def links_https(cls, v: list[str]) -> list[str]:
        return [_https(x) or "" for x in v if x.strip()]


class ProposalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    section: str
    action: str
    target_id: uuid.UUID | None
    payload: dict
    base_profile_version: int
    source: str
    status: str
    created_at: dt.datetime
