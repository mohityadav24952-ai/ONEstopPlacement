"""JD-aware project swap suggestions (Phase 4).

Given a JD-tailored draft resume, look at the user's GitHub project repositories (their README text,
language and topics) and find a repository that demonstrates skills the JD asks for and the current
resume does not show. Then suggest swapping out the existing project that adds the least.

Everything here is deterministic and grounded: a skill counts for a repository only if it literally
appears in that repository's own text, and nothing is added to the profile or the resume until the user
clicks the swap. The skill matching uses the same taxonomy as the rest of the resume module.
"""
import copy
import re
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.db.models.coding import Repository
from app.db.models.profile import StudentProfile
from app.db.models.resume import ResumeAnalysis, ResumeVersion
from app.modules.profile import service as profile_service
from app.modules.resume import facts as facts_mod
from app.modules.resume.skills import SYNONYMS, find_skills, normalize

MAX_SUGGESTIONS = 3
_MD_NOISE = re.compile(r"(!\[[^\]]*\]\([^)]*\)|\[([^\]]*)\]\([^)]*\)|<[^>]+>|[`*_>#|]+)")


def _terms(canon: str) -> set[str]:
    return set(SYNONYMS.get(canon, {canon}))


def skills_in(text: str, wanted: set[str]) -> set[str]:
    """Which of the wanted (canonical) skills appear, as whole words, in the text."""
    lowered = text.lower()
    found = set(find_skills(text)) & wanted
    for canon in wanted - found:
        for term in _terms(canon):
            if re.search(rf"(?<![\w+#]){re.escape(term)}(?![\w+#])", lowered):
                found.add(canon)
                break
    return found


def _plain(markdown: str) -> str:
    return _MD_NOISE.sub(lambda m: m.group(2) or " ", markdown)


def _repo_text(repo: Repository) -> str:
    return "\n".join(x for x in (repo.description, " ".join(repo.topics or []), repo.language, getattr(repo, "readme", None)) if x)


def _requirements(analysis: ResumeAnalysis) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for r in analysis.requirements:
        canon = normalize(r["text"])
        if canon and canon not in out:
            out[canon] = {"text": r["text"], "weight": 2 if r.get("importance") == "must" else 1}
    return out


def _entry_skills(entry: dict, wanted: set[str]) -> set[str]:
    text = " ".join([entry.get("title") or "", " ".join(entry.get("tech") or []), " ".join(b["text"] for b in entry.get("bullets", []))])
    return skills_in(text, wanted) | ({normalize(t) for t in entry.get("tech") or []} & wanted)


def _in_resume(repo: Repository, content: dict) -> bool:
    name = normalize(repo.full_name.split("/")[-1])
    for p in content.get("projects", []):
        if any((link or "").lower().rstrip("/") == repo.url.lower().rstrip("/") for link in p.get("links", [])):
            return True
        if normalize(p.get("title") or "") == name:
            return True
    return False


def _snippet(readme: str, skill: str) -> str | None:
    for line in _plain(readme).splitlines():
        if skills_in(line, {skill}) and len(line.strip()) > 3:
            return " ".join(line.split())[:160]
    return None


def suggest(db: Session, profile: StudentProfile, version: ResumeVersion) -> list[dict[str, Any]]:
    if version.analysis_id is None:
        return []
    analysis = db.get(ResumeAnalysis, version.analysis_id)
    if analysis is None:
        return []
    reqs = _requirements(analysis)
    wanted = set(reqs)
    if not wanted:
        return []
    content = version.content
    projects = content.get("projects", [])
    if not projects:
        return []

    experience_cov: set[str] = set()
    for e in content.get("experience", []):
        experience_cov |= _entry_skills(e, wanted)
    project_cov = {p["id"]: _entry_skills(p, wanted) for p in projects}

    repos = db.scalars(
        select(Repository).where(Repository.profile_id == profile.id, Repository.is_fork.is_(False), Repository.is_archived.is_(False))
    ).all()

    out: list[dict[str, Any]] = []
    for repo in repos:
        if _in_resume(repo, content):
            continue
        text = _repo_text(repo)
        repo_cov = skills_in(text, wanted)
        if not repo_cov:
            continue
        best = None
        for p in projects:
            rest = set(experience_cov)
            for other in projects:
                if other["id"] != p["id"]:
                    rest |= project_cov[other["id"]]
            gained = repo_cov - rest
            lost = (project_cov[p["id"]] - rest) - repo_cov
            net = sum(reqs[s]["weight"] for s in gained) - sum(reqs[s]["weight"] for s in lost)
            key = (net, -len(project_cov[p["id"]]))
            if gained and net > 0 and (best is None or key > best[0]):
                best = (key, p, gained, lost)
        if best is None:
            continue
        _, victim, gained, lost = best
        readme = getattr(repo, "readme", None) or ""
        out.append({
            "id": f"{repo.id}:{victim['id']}",
            "repo": {"id": str(repo.id), "full_name": repo.full_name, "url": repo.url, "description": repo.description, "language": repo.language},
            "replace": {"project_id": victim["id"], "title": victim["title"]},
            "gains": [{"skill": reqs[s]["text"], "evidence": _snippet(readme, s)} for s in sorted(gained)],
            "loses": [reqs[s]["text"] for s in sorted(lost)],
            "message": f"Swap existing project {victim['title']} with GitHub project {repo.full_name.split('/')[-1]} to match JD requirements.",
            "_score": sum(reqs[s]["weight"] for s in gained),
        })
    out.sort(key=lambda s: -s["_score"])
    picked, used_victims = [], set()
    for s in out:
        if s["replace"]["project_id"] in used_victims:
            continue  # one swap per existing project, so suggestions never conflict
        used_victims.add(s["replace"]["project_id"])
        picked.append({k: v for k, v in s.items() if k != "_score"})
        if len(picked) == MAX_SUGGESTIONS:
            break
    return picked


def _blurb(repo: Repository) -> str | None:
    if repo.description:
        return repo.description[:2000]
    for para in re.split(r"\n\s*\n", _plain(getattr(repo, "readme", None) or "")):
        para = " ".join(para.split())
        if len(para) >= 40 and not para.lower().startswith(("table of contents", "installation")):
            return para[:400]
    return None


def apply(db: Session, profile: StudentProfile, version: ResumeVersion, repo_id: uuid.UUID, replace_project_id: str) -> dict[str, Any]:
    """Records the repository as a profile project (the user's click is the approval) and swaps it into the draft."""
    if version.status != "DRAFT":
        raise AppError("VERSION_APPROVED", "Approved versions cannot be changed. Create a new draft.", 409)
    repo = db.scalar(select(Repository).where(Repository.id == repo_id, Repository.profile_id == profile.id))
    if repo is None:
        raise AppError("NOT_FOUND", "That repository was not found.", 404)
    content = copy.deepcopy(version.content)
    if not any(p["id"] == replace_project_id for p in content.get("projects", [])):
        raise AppError("NOT_FOUND", "That resume project was not found.", 404)
    if _in_resume(repo, content):
        raise AppError("CONFLICT", "That project is already on this resume.", 409)

    was_fresh = version.profile_version_hash == facts_mod.profile_hash(profile)
    analysis = db.get(ResumeAnalysis, version.analysis_id) if version.analysis_id else None
    wanted = set(_requirements(analysis)) if analysis else set()
    text = _repo_text(repo)
    tech = [t for t in [repo.language, *(repo.topics or [])] if t]
    tech += [s for s in sorted(skills_in(text, wanted)) if s not in {normalize(t) for t in tech}]
    row = profile_service.create_item(
        db, profile, "projects",
        {"title": repo.full_name.split("/")[-1][:200], "description": _blurb(repo), "tech": tech[:20], "links": [repo.url]},
        source_type="PLATFORM_VERIFIED",
    )

    # Build the new entry exactly like build_content does, from the project's facts.
    parent = f"project:{row.id}"
    bullets = [{"id": f.id, "text": f.text} for f in facts_mod.build_facts(db, profile) if f.parent == parent and "#" in f.id]
    entry = {"id": parent, "title": row.title, "tech": row.tech or [], "links": row.links or [], "bullets": bullets}
    content["projects"] = [entry if p["id"] == replace_project_id else p for p in content["projects"]]
    version.content = content
    if was_fresh:  # the swap was the only profile change, so the draft is still up to date
        version.profile_version_hash = facts_mod.profile_hash(profile)
    db.commit()
    return {"new_project_id": parent, "removed_project_id": replace_project_id}
