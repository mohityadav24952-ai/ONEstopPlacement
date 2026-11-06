"""AI-tailored professional summary for a resume version (2 to 3 short sentences).

The model only drafts. Code decides whether the draft may be used: it must not add numbers, skills or
proper nouns that are absent from the candidate's own facts, and must stay short. If the model is
unavailable or the draft is rejected, a plain summary is built from the profile with no AI at all, and the
result says which one it is, so the editor can label it honestly.
"""
import re
import uuid
from typing import Any

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.ai.llm import LLMClient
from app.ai.runner import run_structured
from app.core.errors import AppError
from app.modules.resume import facts as facts_mod
from app.modules.resume.skills import find_skills

MAX_CHARS = 420
MAX_SENTENCES = 3
_NUM = re.compile(r"\d+(?:[.,]\d+)?%?")
_TOKEN = re.compile(r"[A-Za-z][A-Za-z0-9+#.]*")


class SummaryOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    summary: str = Field(min_length=20, max_length=1200)
    evidence_ids: list[str] = []


def _sentences(text: str) -> list[str]:
    return [s for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s]


def reject_reason(text: str, allowed: str) -> str | None:
    """Why a drafted summary cannot be used, or None. `allowed` is every fact the candidate has, lower-cased."""
    text = text.strip()
    if len(text) > MAX_CHARS:
        return "too long"
    if not 1 <= len(_sentences(text)) <= MAX_SENTENCES:
        return "wrong length"
    if not {n.replace(",", "") for n in _NUM.findall(text)} <= {n.replace(",", "") for n in _NUM.findall(allowed)}:
        return "introduces a number"
    if not set(find_skills(text)) <= set(find_skills(allowed)):
        return "introduces a skill"
    for sentence in _sentences(text):
        for i, token in enumerate(_TOKEN.findall(sentence)):
            if i > 0 and (token[0].isupper() or any(c in token for c in "+#")) and token.lower().rstrip(".") not in allowed:
                return f"introduces '{token}'"
    return None


def fallback_summary(content: dict, role: str | None, company: str | None) -> str:
    """Built only from the approved profile content, with no AI. Plain, but every word is the candidate's own."""
    header = content.get("header") or {}
    skills = [s for s in (content.get("skills") or [])][:4]
    lead = (header.get("headline") or "Computer science student").strip().rstrip(".")
    parts = [f"{lead} with skills in {', '.join(skills)}." if skills else f"{lead}."]
    projects = content.get("projects") or []
    if projects:
        p = projects[0]
        tech = (p.get("tech") or [])[:3]
        parts.append(f"Built {p['title']}" + (f" using {', '.join(tech)}" if tech else "") + ".")
    if role:
        parts.append(f"Looking for a {role} role" + (f" at {company}" if company else "") + ".")
    return " ".join(parts)


def build_summary(
    db: Session, profile, llm: LLMClient, content: dict, *, role: str | None, company: str | None, requirements: list[str],
) -> dict[str, Any]:
    """The summary block for `content["summary"]`. Never raises: any failure falls back to the plain summary."""
    facts = facts_mod.build_facts(db, profile)
    allowed = " ".join([f.text for f in facts] + [str((content.get("header") or {}).get("name") or ""),
                        str((content.get("header") or {}).get("headline") or ""), role or "", company or ""]).lower()
    known = {f.id for f in facts}
    try:
        out = run_structured(
            db, profile.id, llm, "resume_summary", "v1",
            {"target": {"role": role, "company": company, "requirements": requirements[:12]},
             "facts": [{"id": f.id, "text": f.text} for f in facts][:60]},
            SummaryOut,
        )
        why = reject_reason(out.summary, allowed)
        if why is None:
            return {"text": out.summary.strip(), "id": "summary", "ai_generated": True, "source": "ai",
                    "evidence_ids": [e for e in out.evidence_ids if e in known]}
    except AppError:
        pass
    return {"text": fallback_summary(content, role, company), "id": "summary", "ai_generated": False, "source": "template",
            "evidence_ids": []}
