"""The approval gate between a draft and the final resume.

Every item a draft contains carries a `review` state:
  locked   - it matches something the target job description explicitly asks for, so it is hard-included and
             cannot be rejected or removed (it can still be reworded);
  pending  - extracted or AI-written content the user has not decided on yet;
  approved - the user clicked Approve (or wrote / accepted the words themselves);
  rejected - the user clicked Reject. It never renders.

The final PDF renders only locked and approved items, and a version cannot be approved while anything is
pending. Content created before this gate existed has no `review` key and counts as approved.

This module also sorts achievements into the resume sections the templates use (coding profiles,
leadership, certifications), because the profile stores them as one list.
"""
import copy
import re

from app.modules.resume.skills import find_skills, normalize

LOCKED, PENDING, APPROVED, REJECTED = "locked", "pending", "approved", "rejected"
VISIBLE_FINAL = {LOCKED, APPROVED}


def state(item: dict | None) -> str:
    return (item or {}).get("review") or APPROVED  # legacy content predates the gate


# ---------------------------------------------------------------------------------------------------
# Job-description matching (hard inclusion)
# ---------------------------------------------------------------------------------------------------

class JdTerms:
    """What the JD explicitly mentions: canonical skills plus literal keywords (lower case)."""

    def __init__(self, requirements: list[dict] | None, jd_text: str | None):
        reqs = requirements or []
        self.canon: set[str] = {normalize(r["text"]) for r in reqs if r.get("category") != "soft"}
        self.canon |= set(find_skills(jd_text or ""))
        self.keywords: set[str] = {
            " ".join(r["text"].lower().split()) for r in reqs
            if r.get("category") in ("skill", "tool", "domain") and 2 <= len(r["text"]) <= 40
        }

    def __bool__(self) -> bool:
        return bool(self.canon or self.keywords)

    def skill(self, name: str) -> bool:
        return normalize(name) in self.canon

    def text(self, text: str, extra_skills: set[str] | None = None) -> list[str]:
        """The JD terms a piece of text demonstrates (empty when none)."""
        hits = (set(find_skills(text)) | (extra_skills or set())) & self.canon
        low = text.lower()
        for kw in self.keywords:
            if re.search(rf"(?<![\w+#]){re.escape(kw)}(?![\w+#])", low):
                hits.add(kw)
        return sorted(hits)


# ---------------------------------------------------------------------------------------------------
# Achievement kinds -> resume sections
# ---------------------------------------------------------------------------------------------------

_CODING = re.compile(
    r"leetcode|codechef|codeforces|hackerrank|hackerearth|geeksforgeeks|\bgfg\b|atcoder|topcoder|kaggle|"
    r"\bdsa\b|problems? solved|contest|competitive programming|\bknight\b|\bguardian\b|\d\s*-?\s*star|"
    r"max(imum)? rating|peak rating|global rank", re.I)
_CERT = re.compile(
    r"certif|certified|\bcourse\b|coursera|udemy|nptel|edx|\baws\b|amazon web services|oracle|google cloud|azure|"
    r"microsoft|\bassociate\b|practitioner|\btrained\b|job simulation|forage|workshop|specialization|badge", re.I)


def achievement_kind(a: dict) -> str:
    """coding | certification | leadership. "leadership" is the Leadership / Achievements section."""
    if a.get("kind") in ("coding", "certification", "leadership"):
        return a["kind"]
    text = " ".join(str(a.get(k) or "") for k in ("title", "issuer"))
    if _CODING.search(text):
        return "coding"
    if (a.get("type") == "CERTIFICATION") or _CERT.search(text):
        return "certification"
    return "leadership"


# ---------------------------------------------------------------------------------------------------
# Item index (for the checklist and for decisions)
# ---------------------------------------------------------------------------------------------------

def skill_id(name: str) -> str:
    return f"skill:{name}"


def items(content: dict) -> list[dict]:
    """Every reviewable item as {"id", "section", "label", "text", "review", "jd"}, in resume order."""
    out: list[dict] = []
    summary = content.get("summary") or {}
    if summary.get("text"):
        out.append({"id": "summary", "section": "summary", "label": "Summary", "text": summary["text"],
                    "review": state(summary), "jd": summary.get("jd") or []})
    for e in content.get("education") or []:
        text = ", ".join(x for x in (e.get("degree"), e.get("field"), e.get("grade")) if x)
        out.append({"id": e["id"], "section": "education", "label": e.get("institution") or "Education",
                    "text": text or e.get("institution"), "review": state(e), "jd": e.get("jd") or []})
    for section in ("experience", "projects"):
        for e in content.get(section) or []:
            label = e.get("title") or ""
            if not e.get("bullets"):
                out.append({"id": e["id"], "section": section, "label": label, "text": label,
                            "review": state(e), "jd": e.get("jd") or []})
            for b in e.get("bullets") or []:
                out.append({"id": b["id"], "section": section, "label": label, "text": b["text"],
                            "review": state(b), "jd": b.get("jd") or []})
    meta = content.get("skill_meta") or {}
    for name in content.get("skills") or []:
        m = meta.get(name) or {}
        out.append({"id": skill_id(name), "section": "skills", "label": m.get("category") or "Skills", "text": name,
                    "review": state(m), "jd": m.get("jd") or []})
    for a in content.get("achievements") or []:
        out.append({"id": a["id"], "section": achievement_kind(a), "label": a.get("issuer") or "",
                    "text": a.get("title") or "", "review": state(a), "jd": a.get("jd") or []})
    for link in content.get("links") or []:
        out.append({"id": f"link:{link['url']}", "section": "links", "label": link.get("text") or "", "text": link["url"],
                    "review": state(link), "jd": []})
    return out


def pending_count(content: dict) -> int:
    return sum(1 for i in items(content) if i["review"] == PENDING)


def _targets(content: dict) -> dict[str, dict]:
    """id -> the dict that holds that item's review state."""
    out: dict[str, dict] = {}
    if content.get("summary"):
        out["summary"] = content["summary"]
    for e in content.get("education") or []:
        out[e["id"]] = e
    for section in ("experience", "projects"):
        for e in content.get(section) or []:
            out[e["id"]] = e
            for b in e.get("bullets") or []:
                out[b["id"]] = b
    meta = content.setdefault("skill_meta", {})
    for name in content.get("skills") or []:
        out[skill_id(name)] = meta.setdefault(name, {})
    for a in content.get("achievements") or []:
        out[a["id"]] = a
    for link in content.get("links") or []:
        out[f"link:{link['url']}"] = link
    return out


class ReviewError(ValueError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


def decide(content: dict, decisions: dict[str, str]) -> dict:
    """Returns a new content dict with the decisions applied. Locked items cannot be rejected."""
    content = copy.deepcopy(content)
    targets = _targets(content)
    for item_id, decision in decisions.items():
        target = targets.get(item_id)
        if target is None:
            raise ReviewError("NOT_FOUND", "That item is not on this resume.")
        if state(target) == LOCKED:
            if decision == REJECTED:
                raise ReviewError("LOCKED", "This item matches the job description, so it must stay on the resume.")
            continue
        target["review"] = decision
        # Approving a bullet implies its entry; an entry is shown when any of its bullets is.
    return content


def mark(target: dict, new_state: str) -> None:
    """Set a state unless the item is locked (used when the user edits or accepts a rewording)."""
    if state(target) != LOCKED:
        target["review"] = new_state


# ---------------------------------------------------------------------------------------------------
# What actually renders
# ---------------------------------------------------------------------------------------------------

def renderable(content: dict, *, final: bool) -> dict:
    """The content a template may draw. Rejected items never render. With final=True (the exported PDF),
    pending items do not render either; the live preview (final=False) shows them so the user can judge them."""
    ok = VISIBLE_FINAL if final else VISIBLE_FINAL | {PENDING}
    c = copy.deepcopy(content)
    summary = c.get("summary") or {}
    if summary.get("text") and state(summary) not in ok:
        c["summary"] = {**summary, "text": None}
    c["education"] = [e for e in c.get("education") or [] if state(e) in ok]
    for section in ("experience", "projects"):
        kept = []
        for e in c.get(section) or []:
            had = bool(e.get("bullets"))
            e["bullets"] = [b for b in e.get("bullets") or [] if state(b) in ok]
            if e["bullets"] or (not had and state(e) in ok):
                kept.append(e)
        c[section] = kept
    meta = c.get("skill_meta") or {}
    c["skills"] = [s for s in c.get("skills") or [] if state(meta.get(s)) in ok]
    c["achievements"] = [a for a in c.get("achievements") or [] if state(a) in ok]
    c["links"] = [link for link in c.get("links") or [] if state(link) in ok]
    return c
