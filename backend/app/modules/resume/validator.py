"""Claim validator for W3 proposals. Code, not AI, decides what can reach the resume."""
import re
from collections import Counter
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.modules.resume.skills import find_skills

MAX_LEN = 300
_STOP = {"the", "and", "for", "with", "that", "this", "from", "into"}
_NUM = re.compile(r"\d+(?:[.,]\d+)?%?")
_TOKEN = re.compile(r"[A-Za-z][A-Za-z0-9+#.]*")


class ProposalIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    target: str = ""
    kind: Literal["reword", "suggest_unverified"] = "reword"
    before: str = ""
    after: str = Field(default="", max_length=2000)
    rationale: str = Field(default="", max_length=500)
    evidence_ids: list[str] = []


class ProposalSet(BaseModel):
    model_config = ConfigDict(extra="ignore")
    proposals: list[ProposalIn] = Field(default=[], max_length=50)


# Every reworded bullet must open with a strong past-tense action verb ("Architected", "Engineered", "Built").
# Regular verbs end in -ed; these are the common irregular ones.
_IRREGULAR_VERBS = {
    "built", "led", "wrote", "ran", "won", "made", "drove", "set", "cut", "grew", "taught", "held", "brought",
    "took", "found", "rebuilt", "rewrote", "overhauled", "spun", "shipped", "began", "chose", "sold", "drew", "kept",
    "beat", "met", "understood", "upheld", "oversaw", "undertook", "forged", "put", "shot", "dug", "fed", "lent", "spent",
}
_WEAK_OPENERS = ("responsible for", "worked on", "helped", "assisted", "involved in", "participated in", "tasked with",
                 "was ", "were ", "i ", "my ", "we ", "a ", "an ", "the ")


def action_verb_issue(text: str) -> str | None:
    """None when the bullet opens with a strong action verb, else why not."""
    low = text.strip().lower()
    if low.startswith(_WEAK_OPENERS):
        return "weak opener"
    first = re.match(r"[A-Za-z-]+", text.strip())
    if not first:
        return "does not start with an action verb"
    word = first.group(0).lower()
    if not text.strip()[0].isupper() or not (word.endswith("ed") or word in _IRREGULAR_VERBS):
        return "does not start with an action verb"
    return None


def _numbers(text: str) -> set[str]:
    return {n.replace(",", "") for n in _NUM.findall(text)}


def reject_reason(p: ProposalIn, bullets: dict[str, str], facts: dict[str, str]) -> str | None:
    """Return why a reword proposal is unacceptable, or None if it is safe."""
    if p.target not in bullets:
        return "unknown target"
    if p.before.strip() != bullets[p.target].strip():
        return "before text does not match the resume"
    if not p.evidence_ids or any(e not in facts for e in p.evidence_ids):
        return "missing or unknown evidence"
    after = p.after.strip()
    if not after or after == p.before.strip():
        return "no change"
    if len(after) > MAX_LEN:
        return "too long"
    verb = action_verb_issue(after)
    if verb:
        return verb
    allowed = " ".join([facts[e] for e in p.evidence_ids] + [p.before]).lower()
    if not _numbers(after) <= _numbers(allowed):
        return "introduces a number"
    if not set(find_skills(after)) <= set(find_skills(allowed)):
        return "introduces a skill"
    # Proper nouns, tools and acronyms must come from the cited facts.
    for i, token in enumerate(_TOKEN.findall(after)):
        if i > 0 and (token[0].isupper() or any(c in token for c in "+#")) and token.lower() not in allowed:
            return f"introduces '{token}'"
    words = Counter(w.lower() for w in re.findall(r"[A-Za-z]{3,}", after) if w.lower() not in _STOP)
    if words and max(words.values()) > 3:
        return "keyword stuffing"
    return None


def filter_proposals(
    proposals: list[ProposalIn], bullets: dict[str, str], facts: dict[str, str]
) -> tuple[list[dict], list[dict], int]:
    """Returns (accepted reword proposals, unverified suggestions, rejected count)."""
    accepted, unverified, rejected = [], [], 0
    for p in proposals:
        if p.kind == "suggest_unverified":
            if p.after.strip():
                unverified.append({"text": p.after.strip()[:300]})
            continue
        why = reject_reason(p, bullets, facts)
        if why:
            rejected += 1
            continue
        accepted.append({
            "id": f"p{len(accepted) + 1}", "kind": "reword", "target": p.target,
            "before": p.before.strip(), "after": p.after.strip(),
            "rationale": p.rationale.strip()[:300], "evidence_ids": p.evidence_ids, "status": "pending",
        })
    return accepted, unverified, rejected
