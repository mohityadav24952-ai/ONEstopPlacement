"""Ask Placey: short answers for core-subject questions, STAR guidance for behavioural ones.

Order of work for one click (nothing here runs on a page load):
  1. cache lookup by question text (instant, no API call at all);
  2. on a miss: one Tavily web search, then one Gemini call that summarises what was found;
  3. the validated result is cached, but only if it came from a real model and a web search that
     was either successful or not configured (a failed search is retried next time).
"""
import datetime as dt
import hashlib
import logging
import re
import uuid
from typing import Any

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.llm import LLMClient
from app.ai.runner import run_structured
from app.ai.search import SearchClient, SearchError, SearchResult
from app.db.models.placey import PlaceyCache
from app.modules.interview import resources

logger = logging.getLogger("app.ai")
MAX_SOURCES = 5


# ---------------- output shapes ----------------
class AnswerOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    lines: list[str] = Field(min_length=3, max_length=6)


class StarOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    situation: str = Field(min_length=5, max_length=260)
    task: str = Field(min_length=5, max_length=260)
    action: str = Field(min_length=5, max_length=260)
    result: str = Field(min_length=5, max_length=260)


class GuidanceOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    hints: list[str] = Field(min_length=2, max_length=4)
    values: list[str] = Field(min_length=3, max_length=5)
    framing_tips: list[str] = Field(min_length=2, max_length=4)
    star: StarOut


_BULLET = re.compile(r"^\s*(?:[-*•]+|\d+[.)])\s*")


def _tidy(text: str, limit: int = 260) -> str:
    return _BULLET.sub("", str(text)).replace("`", "").replace("**", "").strip()[:limit]


def clean_answer(out: AnswerOut) -> AnswerOut:
    lines = [t for t in (_tidy(x) for x in out.lines) if t]
    if not 3 <= len(lines) <= 6:
        raise ValueError("answer must have 3 to 6 non-empty lines")
    return AnswerOut(lines=lines)


def clean_guidance(out: GuidanceOut) -> GuidanceOut:
    return GuidanceOut(
        hints=[t for t in (_tidy(x) for x in out.hints) if t],
        values=[t for t in (_tidy(x, 60) for x in out.values) if t],
        framing_tips=[t for t in (_tidy(x) for x in out.framing_tips) if t],
        star=StarOut(**{k: _tidy(v) for k, v in out.star.model_dump().items()}),
    )


# ---------------- cache ----------------
def _norm(text: str) -> str:
    return " ".join(re.findall(r"[a-z0-9]+", text.lower()))


def cache_key(kind: str, question: str, company: str | None) -> str:
    """Case, spacing and punctuation never matter. Guidance depends on the company, answers do not."""
    parts = [kind, _norm(question)] + ([_norm(company or "")] if kind == "guidance" else [])
    return hashlib.sha256("|".join(parts).encode()).hexdigest()


def _from_cache(db: Session, key: str) -> PlaceyCache | None:
    row = db.scalar(select(PlaceyCache).where(PlaceyCache.cache_key == key))
    if row is not None:
        row.hits += 1
        row.last_hit_at = dt.datetime.now(dt.timezone.utc)
        db.commit()
    return row


def _store(db: Session, key: str, kind: str, question: str, company: str | None, payload: dict, model: str, grounded: bool) -> None:
    if db.scalar(select(PlaceyCache.id).where(PlaceyCache.cache_key == key)):
        return  # a concurrent request got there first
    db.add(PlaceyCache(cache_key=key, kind=kind, question_text=question[:2000], company=(company or None), payload=payload,
                       model_id=model, grounded=grounded, hits=0))
    db.commit()


# ---------------- the click ----------------
def _sources_out(results: list[SearchResult]) -> list[dict[str, str]]:
    return [{"title": r["title"], "url": r["url"]} for r in results]


def _values_note(company: str | None, grounded: bool) -> str:
    who = company or "the company"
    if grounded and company:
        return (f"Drawn from web search results and general knowledge (see the sources). Companies change their wording, "
                f"so confirm it on {who}'s own careers page.")
    return f"These are general qualities interviewers look for, not claims about {who}. Check {who}'s own careers page for what it actually says."


def ask(
    db: Session, profile_id: uuid.UUID, llm: LLMClient, search: SearchClient, *,
    kind: str, question: str, topic: str, company: str | None,
) -> dict[str, Any]:
    """Return the reply for one Ask Placey click. `kind` is "answer" (core subject) or "guidance" (HR)."""
    company = (company or "").strip()[:80] or None
    key = cache_key(kind, question, company)
    hit = _from_cache(db, key)
    if hit is not None:
        return {**hit.payload, "cached": True, "model": hit.model_id}

    # a cache miss: this is the only place web search and the model are ever called
    results: list[SearchResult] = []
    search_failed = False
    query = f"{question} explained interview answer" if kind == "answer" else (f"{company} core values leadership principles official" if company else "")
    if query and search.configured:
        try:
            seen: set[str] = set()
            results = [r for r in search.search(query, MAX_SOURCES) if not (r["url"] in seen or seen.add(r["url"]))]  # one row per page
        except SearchError:
            search_failed = True  # answer without web results, and say so
    grounded = bool(results)

    if kind == "answer":
        out = run_structured(db, profile_id, llm, "interview_answer", "v2",
                             {"question": question, "topic": topic, "sources": results}, AnswerOut, validate=clean_answer)
        body: dict[str, Any] = {"lines": out.lines}
    else:
        out = run_structured(db, profile_id, llm, "interview_guidance", "v2",
                             {"question": question, "company": company, "sources": results}, GuidanceOut, validate=clean_guidance)
        body = {"hints": out.hints, "values": out.values, "framing_tips": out.framing_tips, "star": out.star.model_dump(),
                "values_note": _values_note(company, grounded)}

    payload = {
        "kind": kind, "question": question, "topic": topic, "mock": llm.provider == "mock", "grounded": grounded,
        "sources": _sources_out(results), "read_more": resources.read_more_link(question),
        "disclaimer": ("Summarised by an AI model from web search results. It can still be wrong, so check the sources."
                       if grounded else
                       "Written by an AI model without web results this time. It can be wrong, so check it against a trusted source."),
        **body,
    }
    # Cache only real model output, and only if the web search worked (or is not set up at all).
    if llm.provider != "mock" and not search_failed:
        _store(db, key, kind, question, company, payload, llm.model, grounded)
    return {**payload, "cached": False, "model": llm.model}
