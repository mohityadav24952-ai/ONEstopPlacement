"""Deterministic stand-in for a real model, used when no API key is configured.

It reads the structured payload (never calls out) and returns extraction-style
answers, so the whole product works end to end in development and tests.
"""
import json
import re

from app.ai.llm import LLMRequest, LLMResponse
from app.modules.resume.skills import find_skills

_HEADINGS = {
    "education": "education",
    "experience": "experience",
    "work experience": "experience",
    "internships": "experience",
    "projects": "projects",
    "skills": "skills",
    "technical skills": "skills",
    "achievements": "achievements",
    "certifications": "achievements",
}
_BULLET = re.compile(r"^\s*[-•*]\s+(.*)$")


def _parse_resume(text: str) -> dict:
    out: dict[str, list] = {k: [] for k in ("education", "experience", "projects", "skills", "achievements")}
    section = None
    current: dict | None = None
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        key = _HEADINGS.get(line.rstrip(":").lower())
        if key:
            section, current = key, None
            continue
        bullet = _BULLET.match(line)
        if section == "skills":
            for name in re.split(r"[,;|]", bullet.group(1) if bullet else line):
                if name.strip():
                    out["skills"].append({"name": name.strip(), "source_span": name.strip(), "confidence": "medium"})
        elif section == "education":
            out["education"].append({"institution": line, "source_span": line, "confidence": "medium"})
        elif section == "achievements":
            out["achievements"].append({"title": (bullet.group(1) if bullet else line), "source_span": line, "confidence": "medium"})
        elif section in ("experience", "projects"):
            if bullet and current is not None:
                key2 = "description_points" if section == "experience" else "description"
                if section == "experience":
                    current.setdefault(key2, []).append(bullet.group(1))
                else:
                    current[key2] = (current.get(key2, "") + " " + bullet.group(1)).strip()
            elif section == "experience":
                parts = re.split(r"\s+(?:-|at|\|)\s+", line, maxsplit=1)
                current = {"title": parts[0], "organization": parts[1] if len(parts) > 1 else parts[0],
                           "source_span": line, "confidence": "low"}
                out["experience"].append(current)
            else:
                current = {"title": line, "source_span": line, "confidence": "medium"}
                out["projects"].append(current)
    return out


def _extract_jd(text: str) -> dict:
    reqs, seen = [], set()
    for raw in re.split(r"[\n.]", text):
        line = raw.strip(" -•*\t")
        if not line:
            continue
        for skill in find_skills(line):
            if skill in seen:
                continue
            seen.add(skill)
            low = line.lower()
            nice = any(w in low for w in ("nice to have", "plus", "preferred", "bonus"))
            reqs.append({"text": skill, "category": "skill",
                         "importance": "nice" if nice else "must", "jd_quote": line})
    return {"requirements": reqs, "jd_quality": "ok" if len(reqs) >= 2 else "low"}


def _propose(payload: dict) -> dict:
    wanted = {r["text"].lower() for r in payload.get("requirements", [])}
    proposals = []
    for bullet in payload.get("bullets", []):
        before = bullet["text"]
        after = before[0].upper() + before[1:]
        if not after.endswith("."):
            after += "."
        mentions = set(find_skills(before))
        if after != before and mentions & wanted:
            proposals.append({
                "target": bullet["id"], "kind": "reword", "before": before, "after": after,
                "rationale": "Polishes wording; this bullet is relevant to the role.",
                "evidence_ids": [bullet["id"]],
            })
    return {"proposals": proposals}


def _gen_questions(payload: dict) -> dict:
    topic, count = payload.get("topic", "DSA"), int(payload.get("count", 3))
    skills = payload.get("skills") or []
    seeds = [
        f"Explain a core {topic} concept you would expect a {payload.get('role') or 'junior engineer'} to know, using a small example.",
        f"What is a common mistake candidates make in {topic} questions, and how do you avoid it?",
        f"Describe how you would debug a failing solution in the {topic} area, step by step.",
        f"Compare two approaches to a typical {topic} problem and explain the trade-offs.",
        f"How would you explain a {topic} idea to a beginner in three sentences?",
    ]
    if skills:
        seeds.insert(0, f"How have you used {skills[0]} in a way that relates to {topic}?")
    levels = ["EASY", "MEDIUM", "MEDIUM", "HARD", "MEDIUM", "EASY"]
    return {"questions": [{"text": t, "difficulty": levels[i % 6]} for i, t in enumerate(seeds[:count])]}


class MockLLM:
    provider = "mock"
    model = "mock-1"

    def generate_json(self, request: LLMRequest) -> LLMResponse:
        p = request.payload
        if request.workflow == "resume_parse":
            result = _parse_resume(p.get("text", ""))
        elif request.workflow == "jd_extract":
            result = _extract_jd(p.get("jd_text", ""))
        elif request.workflow == "resume_propose":
            result = _propose(p)
        elif request.workflow == "interview_generate":
            result = _gen_questions(p)
        else:
            result = {}
        return LLMResponse(text=json.dumps(result), model=self.model)
