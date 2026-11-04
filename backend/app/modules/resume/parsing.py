"""W1: resume parsing. AI output is a candidate extraction, grounded against the source text."""
import re
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.modules.profile import schemas

Confidence = Literal["low", "medium", "high"]


def _norm(text: str) -> str:
    return re.sub(r"[^a-z0-9+#.]+", " ", text.lower()).strip()


def appears_in(value: str, source_norm: str) -> bool:
    return bool(value) and _norm(value) in source_norm


class _Item(BaseModel):
    model_config = ConfigDict(extra="ignore")
    source_span: str = Field(default="", max_length=600)
    confidence: Confidence = "low"


class ParsedEducation(_Item):
    institution: str = ""
    degree: str | None = None
    field: str | None = None
    grade: str | None = None


class ParsedExperience(_Item):
    organization: str = ""
    title: str = ""
    description_points: list[str] = []


class ParsedProject(_Item):
    title: str = ""
    description: str | None = None
    tech: list[str] = []


class ParsedSkill(_Item):
    name: str = ""


class ParsedAchievement(_Item):
    title: str = ""
    issuer: str | None = None


class ParseOutput(BaseModel):
    model_config = ConfigDict(extra="ignore")
    education: list[ParsedEducation] = []
    experience: list[ParsedExperience] = []
    projects: list[ParsedProject] = []
    skills: list[ParsedSkill] = []
    achievements: list[ParsedAchievement] = []


# Which field identifies an item, and the profile schema it must satisfy.
_KEY = {
    "education": ("institution", schemas.EducationIn),
    "experience": ("title", schemas.ExperienceIn),
    "projects": ("title", schemas.ProjectIn),
    "skills": ("name", schemas.SkillIn),
    "achievements": ("title", schemas.AchievementIn),
}


def ground(parsed: ParseOutput, source_text: str) -> dict:
    """Drop anything not supported by the source text; never guess (Blueprint W1)."""
    source = _norm(source_text)
    result: dict = {}
    dropped = 0
    for section, (key, schema) in _KEY.items():
        kept = []
        for item in getattr(parsed, section):
            data = item.model_dump()
            span_ok = appears_in(item.source_span, source)
            key_ok = appears_in(str(data.get(key) or ""), source)
            if not (span_ok and key_ok):
                dropped += 1
                continue
            fields = {k: v for k, v in data.items() if k not in ("source_span", "confidence") and v not in (None, "", [])}
            # Fields other than the key must also appear in the source, else they are removed.
            for k, v in list(fields.items()):
                if k == key:
                    continue
                values = v if isinstance(v, list) else [v]
                if not all(appears_in(str(x), source) for x in values):
                    del fields[k]
            try:
                schema.model_validate(fields)
            except ValidationError:
                dropped += 1
                continue
            kept.append({"fields": fields, "source_span": item.source_span, "confidence": item.confidence})
        result[section] = kept
    result["dropped_count"] = dropped
    result["needs_manual_entry"] = sum(len(v) for k, v in result.items() if isinstance(v, list)) == 0
    return result
