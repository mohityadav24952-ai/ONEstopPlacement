"""W1: resume parsing. AI output is a candidate extraction, grounded against the source text."""
import re
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.modules.profile import schemas
from app.modules.resume.skills import categorize, normalize, pretty, skill_mentions, clean_text
from app.modules.resume.text import dedupe_key, split_points, tidy

Confidence = Literal["low", "medium", "high"]


def _norm(text: str) -> str:
    # clean_text rejoins "C ++" and normalises Unicode, so PDF spacing quirks cannot make a real skill look absent
    return re.sub(r"[^a-z0-9+#.]+", " ", clean_text(text).lower()).strip()


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
    points: list[str] = []  # the project's bullets exactly as written (parse prompt v3)
    tech: list[str] = []


class ParsedSkill(_Item):
    name: str = ""
    category: str | None = None  # the Skills sub-heading (a label, not a claim, so it is not grounded)


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
                if k in (key, "category"):
                    continue
                values = v if isinstance(v, list) else [v]
                if not all(appears_in(str(x), source) for x in values):
                    del fields[k]
            fields = _tidy_fields(section, fields)
            try:
                schema.model_validate(fields)
            except ValidationError:
                dropped += 1
                continue
            kept.append({"fields": fields, "source_span": item.source_span, "confidence": item.confidence})
        result[section] = _dedupe(section, kept)
    result["dropped_count"] = dropped
    result["needs_manual_entry"] = sum(len(v) for k, v in result.items() if isinstance(v, list)) == 0
    return result


_RANK = {"low": 0, "medium": 1, "high": 2}


def item_key(section: str, fields: dict) -> str:
    """What makes two entries the same entry. Used for parsed items, imports and resume content alike."""
    if section == "education":
        return dedupe_key(fields.get("institution"), fields.get("degree"))
    if section == "experience":
        return dedupe_key(fields.get("title"), fields.get("organization"))
    if section == "skills":
        return normalize(str(fields.get("name") or ""))
    return dedupe_key(fields.get("title"))


def _tidy_fields(section: str, fields: dict) -> dict:
    """Rejoin PDF-wrapped lines, and turn project bullets into one description the resume can split again.

    `points` is not a profile field: each point becomes a sentence of `description`, so that sentence-level
    splitting later reproduces the original bullets without ever cutting a sentence in half."""
    out = {}
    for k, v in fields.items():
        if isinstance(v, str):
            out[k] = tidy(v)
        elif isinstance(v, list):
            out[k] = [tidy(x) if isinstance(x, str) else x for x in v if not isinstance(x, str) or tidy(x)]
        else:
            out[k] = v
    if section == "projects":
        points = out.pop("points", []) or []
        pieces = [p for p in split_points(out.get("description")) if p] + [p for pt in points for p in split_points(pt)]
        seen: set[str] = set()
        unique = [p for p in pieces if not (dedupe_key(p) in seen or seen.add(dedupe_key(p)))]
        if unique:
            out["description"] = " ".join(p if p.endswith((".", "!", "?")) else p + "." for p in unique)[:2000]
    if section == "experience" and out.get("description_points"):
        pts = [p for raw in out["description_points"] for p in split_points(raw)]
        seen = set()
        out["description_points"] = [p for p in pts if not (dedupe_key(p) in seen or seen.add(dedupe_key(p)))][:12]
    if section == "skills":
        out["category"] = categorize(out.get("name", ""), out.get("category"))
    return out


def _dedupe(section: str, items: list[dict]) -> list[dict]:
    """The same entry often appears 2-3 times in a model's output (once per mention in the resume). Keep one:
    the most confident, with list fields (bullets, tech) merged so nothing real is lost."""
    by_key: dict[str, dict] = {}
    order: list[str] = []
    for it in items:
        k = item_key(section, it["fields"])
        if k not in by_key:
            by_key[k] = it
            order.append(k)
            continue
        keep = by_key[k]
        first_desc, later_desc = keep["fields"].get("description"), it["fields"].get("description")
        if section == "projects" and first_desc and later_desc:
            # Two halves of one project's bullets: keep every sentence once, in reading order.
            merged, seen = [], set()
            for sentence in split_points(first_desc) + split_points(later_desc):
                if dedupe_key(sentence) not in seen:
                    seen.add(dedupe_key(sentence))
                    merged.append(sentence)
            keep["fields"]["description"] = it["fields"]["description"] = " ".join(merged)[:2000]
        if _RANK[it["confidence"]] > _RANK[keep["confidence"]]:
            keep, other = it, keep
            by_key[k] = keep
        else:
            other = it
        for f, v in other["fields"].items():
            have = keep["fields"].get(f)
            if have in (None, "", []):
                keep["fields"][f] = v
            elif isinstance(have, list) and isinstance(v, list):
                seen = {dedupe_key(str(x)) for x in have}
                keep["fields"][f] = have + [x for x in v if dedupe_key(str(x)) not in seen]
    return [by_key[k] for k in order]


def add_detected_skills(result: dict, source_text: str) -> int:
    """Safety net for AI false negatives: every skill the taxonomy finds in the text that the AI did not list.

    Deterministic and grounded by construction (the span is a line of the resume). The name is written the way
    the resume wrote it unless the tidy form also appears in the text. Returns how many were added."""
    have = {normalize(i["fields"].get("name", "")) for i in result.get("skills", [])}
    source = _norm(source_text)
    added = 0
    for canon, written, line in skill_mentions(source_text):
        if canon in have:
            continue
        name = pretty(canon) if appears_in(pretty(canon), source) else written
        fields = {"name": name, "category": categorize(name)}
        try:
            schemas.SkillIn.model_validate(fields)
        except ValidationError:
            continue
        result.setdefault("skills", []).append({"fields": fields, "source_span": line[:600], "confidence": "high"})
        have.add(canon)
        added += 1
    if added:
        result["needs_manual_entry"] = False
    return added
