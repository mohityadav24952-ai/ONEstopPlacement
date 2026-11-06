"""Indexed list of the user's profile facts. Every claim in a resume traces to a fact id."""
import hashlib
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.db.models.profile import StudentProfile
from app.modules.profile import service as profile_service
from app.modules.resume.skills import find_skills, normalize
from app.modules.resume.text import dedupe_key, split_points


@dataclass
class Fact:
    id: str
    type: str  # skill | experience | project | achievement | education
    text: str
    parent: str  # entity id like "project:<uuid>"
    skills: set[str]
    level: str | None = None


def profile_hash(profile: StudentProfile) -> str:
    # Every profile change bumps `version`, so this changes whenever inputs change.
    return hashlib.sha256(f"{profile.id}:{profile.version}".encode()).hexdigest()


def _points(texts: list[str]) -> list[str]:
    """One bullet per sentence, PDF line-wraps rejoined, repeated sentences removed. A sentence is never cut."""
    out, seen = [], set()
    for t in texts:
        for p in split_points(t):
            k = dedupe_key(p)
            if k not in seen:
                seen.add(k)
                out.append(p)
    return out


def build_facts(db: Session, profile: StudentProfile) -> list[Fact]:
    facts: list[Fact] = []
    for s in profile_service.list_items(db, profile, "skills"):
        facts.append(Fact(f"skill:{s.id}", "skill", s.name, f"skill:{s.id}", {normalize(s.name)}, s.level))
    for e in profile_service.list_items(db, profile, "experience"):
        parent = f"experience:{e.id}"
        head = f"{e.title} at {e.organization}"
        facts.append(Fact(parent, "experience", head, parent, set()))
        for i, point in enumerate(_points(e.description_points or [])):
            facts.append(Fact(f"{parent}#{i}", "experience", point, parent, set(find_skills(point))))
    for p in profile_service.list_items(db, profile, "projects"):
        parent = f"project:{p.id}"
        tech = {normalize(t) for t in (p.tech or [])}
        facts.append(Fact(parent, "project", p.title, parent, tech))
        lines = [p.description, p.contribution, *(p.outcomes or [])]
        for i, line in enumerate(_points([x for x in lines if x])):
            facts.append(Fact(f"{parent}#{i}", "project", line, parent, tech | set(find_skills(line))))
    for a in profile_service.list_items(db, profile, "achievements"):
        facts.append(Fact(f"achievement:{a.id}", "achievement", a.title, f"achievement:{a.id}", set()))
    for ed in profile_service.list_items(db, profile, "education"):
        text = ", ".join(x for x in (ed.degree, ed.field, ed.institution) if x)
        facts.append(Fact(f"education:{ed.id}", "education", text, f"education:{ed.id}", set()))
    return facts


def match_requirements(requirements: list[dict], facts: list[Fact]) -> list[dict]:
    """Deterministic: matched / partial / missing, with the fact ids that justify it."""
    matches = []
    for req in requirements:
        canon = normalize(req["text"])
        listed = [f for f in facts if f.type == "skill" and canon in f.skills]
        used = [f for f in facts if f.type in ("experience", "project") and canon in f.skills]
        strong_skill = any(f.level in ("INTERMEDIATE", "ADVANCED") for f in listed)
        if used or (listed and strong_skill):
            status = "matched"
        elif listed:
            status = "partial"
        else:
            status = "missing"
        evidence = [f.id for f in (*used, *listed)]
        matches.append({"requirement_id": req["id"], "status": status, "evidence_ids": evidence})
    return matches
