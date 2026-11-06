"""LLM resume extraction: strict schema in, legacy portfolio JSON out (the adapter).

The model answers in `llm_schema.LLMResume`, which keeps projects, coding profiles, achievements and
certifications apart. `to_portfolio` maps that onto the portfolio shape the frontend already renders
(frontend/types/portfolio.ts), doing every bit of formatting and section mixing in Python:

  * project bullets -> one `description` string; tech_stack -> `techStack`;
  * achievements/leadership, certifications and coding-profile lines -> `achievements` (the portfolio
    has no separate lists for them), with the platform as `issuer` for coding profiles;
  * coding-profile and header links -> `basics.socials` + `handles`, from the PDF's own links.

Nothing the model returns is trusted as written. Every string must appear in the resume text (compared
on letters and digits only, so PDF spacing and quote styles do not matter):
  * a project whose title is not printed, is a section heading or a coding platform, or reads like a
    sentence fragment is dropped;
  * a reworded bullet is never shown: the project's bullets come from the rule-based parse of the same
    text when it found that project, otherwise only the verbatim bullets are kept.
"""
import json
import logging
import re
import unicodedata
from typing import Any

from pydantic import ValidationError

from app.ai.llm import LLMClient, LLMError, LLMRequest, parse_json_object
from app.modules.site_builder import parser
from app.modules.site_builder.llm_schema import SYSTEM, LLMProject, LLMResume, response_schema

logger = logging.getLogger("app.site")

_PLATFORMS = {
    "leetcode": "LeetCode", "codechef": "CodeChef", "codeforces": "Codeforces", "hackerrank": "HackerRank",
    "geeksforgeeks": "GeeksforGeeks", "hackerearth": "HackerEarth", "atcoder": "AtCoder", "topcoder": "TopCoder",
}
_QUOTES = str.maketrans({"‘": "'", "’": "'", "“": '"', "”": '"'})


def _key(text: str) -> str:
    """Letters and digits only: what 'the same words' means when comparing model output to the PDF."""
    return re.sub(r"[^a-z0-9]+", "", unicodedata.normalize("NFKC", str(text or "")).translate(_QUOTES).lower())


class _Source:
    def __init__(self, text: str) -> None:
        self.key = _key(text)
        self.dropped = 0

    def has(self, value: str) -> bool:
        k = _key(value)
        return bool(k) and k in self.key

    def keep(self, value: str) -> str:
        """The value if the resume contains it, else "" (counted as dropped)."""
        value = re.sub(r"\s+", " ", str(value or "")).strip()
        if not value:
            return ""
        if self.has(value):
            return value
        self.dropped += 1
        return ""

    def keep_all(self, values: list[str]) -> list[str]:
        out = [v for v in (self.keep(x) for x in values) if v]
        return list(dict.fromkeys(out))


def _platform(text: str) -> str:
    low = text.lower()
    return next((name for k, name in _PLATFORMS.items() if k in low), "")


def _achievement(text: str, issuer: str = "") -> dict[str, Any]:
    title = text
    if len(text) > 200:  # a clean cut in the title, the full sentence in the description
        title = text[:197].rsplit(" ", 1)[0].rstrip(",;:") + "…"
    return {"id": parser.new_id("a"), "title": title, "issuer": issuer, "description": text if title != text else ""}


def _rule_project(title: str, rules: dict[str, Any]) -> dict[str, Any] | None:
    k = _key(title)
    for p in rules.get("projects") or []:
        rk = _key(p.get("title", ""))
        if rk and (rk == k or (min(len(rk), len(k)) >= 6 and (rk in k or k in rk))):
            return p
    return None


def _project(p: LLMProject, src: _Source, links: list[str], rules: dict[str, Any]) -> dict[str, Any] | None:
    title = re.sub(r"\s+", " ", p.title).strip()
    if not parser.plausible_project_title(title) or _platform(title) or not src.has(title):
        src.dropped += 1
        return None
    bullets = [re.sub(r"\s+", " ", b).strip() for b in p.bullets if b.strip()]
    verbatim = [b for b in bullets if src.has(b)]
    description = " ".join(verbatim)
    if len(verbatim) < len(bullets):
        src.dropped += len(bullets) - len(verbatim)
        rule = _rule_project(title, rules)
        if rule and rule.get("description"):
            description = rule["description"]  # the rule-based parse copies the PDF text, so it is verbatim
    urls = {k: v.strip() for k, v in (("githubUrl", p.github_url), ("liveUrl", p.live_url))
            if v.strip() and (v.strip() in links or src.has(v))}
    return {
        "id": parser.new_id("p"),
        "title": title,
        "tagline": src.keep(p.tagline),
        "description": description[:3000],
        "techStack": [t.strip(" .") for t in src.keep_all(p.tech_stack)][:15],
        "githubUrl": urls.get("githubUrl") or parser.github_for(title, links),
        "liveUrl": urls.get("liveUrl"),
    }


def to_portfolio(resume: LLMResume, text: str, links: list[str], rules: dict[str, Any]) -> dict[str, Any]:
    """The strict extraction -> the legacy portfolio dict (the shape `parser.sanitize` validates)."""
    src = _Source(text)
    b = resume.basics

    projects = [p for p in (_project(p, src, links, rules) for p in resume.projects) if p]
    seen: set[str] = set()
    projects = [p for p in projects if not (_key(p["title"]) in seen or seen.add(_key(p["title"])))]
    projects = projects[: parser.MAX_PROJECTS]
    for i, p in enumerate(projects):
        p["featured"] = i < 3

    experience = []
    for e in resume.experience:
        role, company = src.keep(e.role), src.keep(e.company)
        if not (role or company):
            continue
        experience.append({
            "id": parser.new_id("e"), "role": role, "company": company, "location": src.keep(e.location),
            "startDate": src.keep(e.start_date), "endDate": src.keep(e.end_date),
            "descriptionBullets": src.keep_all(e.bullets)[:15], "techUsed": src.keep_all(e.tech_used),
        })

    education = []
    for ed in resume.education:
        degree, institution = src.keep(ed.degree), src.keep(ed.institution)
        if not (degree or institution):
            continue
        education.append({
            "id": parser.new_id("ed"), "degree": degree or institution, "institution": institution,
            "location": src.keep(ed.location), "startYear": src.keep(ed.start_year), "endYear": src.keep(ed.end_year),
            "score": src.keep(ed.score) or None,
        })

    # The portfolio has one achievements list: leadership, certifications and coding profiles all go in it.
    achievements = [_achievement(t) for t in src.keep_all(resume.achievements_and_leadership)]
    achievements += [_achievement(t) for t in src.keep_all(resume.certifications)]
    achievements += [_achievement(t, _platform(t)) for t in src.keep_all(resume.coding_profiles)]
    unique: dict[str, dict[str, Any]] = {}
    for a in achievements:
        unique.setdefault(_key(a["description"] or a["title"]), a)

    # Profile links come from the PDF itself (hyperlinks and printed URLs), never from the model.
    profile_text = " ".join(resume.coding_profiles)
    all_links = links + parser.URL.findall(profile_text) + ["https://" + m for m in parser.BARE_URL.findall(profile_text)]

    skills = resume.skills
    portfolio = {
        "basics": {
            "fullName": src.keep(b.full_name), "headline": src.keep(b.headline), "email": src.keep(b.email),
            "phone": src.keep(b.phone) or None, "location": src.keep(b.location), "socials": parser.socials_from(all_links),
        },
        "skills": {
            "languages": src.keep_all(skills.languages), "frameworks": src.keep_all(skills.frameworks),
            "databasesAndCloud": src.keep_all(skills.databases_and_cloud), "aiAndMl": src.keep_all(skills.ai_and_ml),
            "coreCsAndTools": src.keep_all(skills.core_cs_and_tools),
        },
        "projects": projects,
        "experience": experience,
        "education": education,
        "achievements": list(unique.values()),
        "handles": parser.find_handles(all_links),
    }
    if src.dropped:
        logger.info("site_parse: dropped %d model values that are not verbatim in the resume", src.dropped)
    return portfolio


def llm_parse(client: LLMClient, text: str, links: list[str], rules: dict[str, Any] | None = None) -> dict[str, Any] | None:
    """The model's strict extraction mapped to the portfolio shape, or None (use the rule-based parse)
    when the model is unavailable or its answer does not match the strict schema."""
    schema = response_schema()
    # The schema is also written into the prompt, so a model that cannot take it as a parameter still
    # knows the exact keys (the provider retries without the parameter if it rejects it).
    user = ("RESUME TEXT:\n<<<\n" + text + "\n>>>\n\nLINKS FOUND IN THE FILE:\n" + "\n".join(links[:60])
            + "\n\nANSWER WITH JSON MATCHING THIS SCHEMA EXACTLY (same keys, no others):\n" + json.dumps(schema))
    request = LLMRequest(workflow="site_parse", system=SYSTEM, user=user, payload={}, response_schema=schema)
    try:
        raw = parse_json_object(client.generate_json(request).text)
    except LLMError as exc:
        logger.info("site_parse: LLM unavailable (%s), using heuristic parser", exc.category)
        return None
    try:
        resume = LLMResume.model_validate(raw)
    except ValidationError as exc:
        logger.warning("site_parse: model answer broke the strict schema (%d errors), using heuristic parser", exc.error_count())
        return None
    logger.info("site_parse: parsed by %s/%s", getattr(client, "provider", "?"), getattr(client, "model", "?"))
    return to_portfolio(resume, text, links, rules if rules is not None else parser.heuristic_parse(text, links))
