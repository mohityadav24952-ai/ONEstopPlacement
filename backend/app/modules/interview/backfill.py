"""Fills the DSA days of a plan that would otherwise be empty ("0/0").

The planner has a finite set of DSA link cards, so a long plan ran out of them after a few days.
For every DSA day left without items:

1. Hynts first: if Hynts has a company-wise sheet for the company, the day gets a direct link to it.
2. Fallback only when Hynts has no sheet: 5 mixed problems per day from the curated list of 100
   (fallback_dsa.py), shuffled so every day mixes topics and platforms. The shuffle depends only on the
   company and role, so the same inputs give the same plan (as with the rest of the DSA cards).
   Each problem is used once per plan; if there are more empty days than 20 the rest stay empty,
   and the plan says so.

Everything here is a link to another site. No problem text is stored.
"""
import hashlib
import random
import re
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.interview import InterviewQuestion, QuestionSource
from app.db.models.profile import StudentProfile
from app.modules.interview import hynts
from app.modules.interview.fallback_dsa import FALLBACK_DSA
from app.modules.interview.resources import clean_company

FALLBACK_PER_DAY = 5
_ALLOWED_HOSTS = ("hynts.in", "leetcode.com", "www.geeksforgeeks.org", "www.naukri.com")


def _hash(text: str) -> str:
    # same normalisation as the interview router, so rows are reused across plans
    return hashlib.sha256(re.sub(r"\W+", " ", text.lower()).strip().encode()).hexdigest()


def _button(url: str) -> str:
    host = url.split("/")[2]
    return {"hynts.in": "Open on Hynts", "leetcode.com": "Solve on LeetCode",
            "www.geeksforgeeks.org": "Solve on GFG", "www.naukri.com": "Naukri Code360"}[host]


def _link_row(db: Session, profile: StudentProfile, existing: dict[str, InterviewQuestion],
              title: str, url: str, note: str, tags: list[str]) -> InterviewQuestion:
    assert url.startswith("https://") and url.split("/")[2] in _ALLOWED_HOSTS, url  # fixed hosts only
    h = _hash(f"{title}|{url}")
    q = existing.get(h)
    if q is None:
        q = InterviewQuestion(owner_profile_id=profile.id, text=title, text_hash=h, topic="DSA", difficulty="MEDIUM",
                              provenance_type="CURATED", role_tags=["dsa-link", *tags], company=None)
        db.add(q)
        db.flush()
        db.add(QuestionSource(question_id=q.id, source_type="CURATED", source_url=url, title=_button(url),
                              license_note="A link only. Nothing is copied from the page it opens.",
                              reliability_note=note))
        existing[h] = q
    return q


def fill_empty_days(db: Session, profile: StudentProfile, plan: dict[str, Any], company: str, role: str) -> dict[str, Any]:
    """Mutates `plan` (question ids of empty DSA days, topics_without_questions) and describes what it did."""
    empty = [d for d in plan["days"] if d["topic"] == "DSA" and not d["question_ids"]]
    if not empty:
        return {"source": None, "days": [], "company_on_hynts": hynts.hynts_url(company) is not None}

    existing = {q.text_hash: q for q in db.scalars(select(InterviewQuestion).where(
        InterviewQuestion.owner_profile_id == profile.id, InterviewQuestion.topic == "DSA"))}
    url = hynts.hynts_url(company)
    filled: list[int] = []

    if url:
        label = clean_company(company).title()
        for d in empty:
            q = _link_row(db, profile, existing, f"Day {d['day']}: {label} company-wise DSA sheet on Hynts", url,
                          "Hynts' company-wise sheet: open it and work through the next unsolved problems for this day.",
                          ["hynts"])
            d["question_ids"] = [str(q.id)]
            filled.append(d["day"])
        source = "hynts"
    else:
        order = list(range(len(FALLBACK_DSA)))
        stable = int(hashlib.sha256(f"{clean_company(company)}|{role.strip().lower()}".encode()).hexdigest()[:12], 16)
        random.Random(stable).shuffle(order)
        cursor = 0
        for d in empty:
            chunk = order[cursor: cursor + FALLBACK_PER_DAY]
            if not chunk:
                break  # all 100 are used; remaining days stay empty and are reported as such
            cursor += len(chunk)
            ids = []
            for i in chunk:
                title, link = FALLBACK_DSA[i]
                ids.append(str(_link_row(db, profile, existing, title, link,
                                         "From the curated fallback list of 100 DSA problems.", ["dsa-fallback"]).id))
            d["question_ids"] = ids
            filled.append(d["day"])
        source = "fallback"

    plan["topics_without_questions"] = sorted({d["topic"] for d in plan["days"] if not d["question_ids"]})
    return {"source": source, "days": filled, "company_on_hynts": url is not None}
