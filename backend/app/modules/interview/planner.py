"""Deterministic preparation planner: same inputs (and seed) always give the same plan.

Distribution rules:
* Days are first split between topics by weight (largest remainder), as before.
* Written-question topics (OOP, DBMS, OS, CN, HR) spread their questions EVENLY over their days, 2 to 5 per
  day. When a topic has too few questions to give every allotted day at least 2, it uses fewer days: a day
  is never empty, so the plan never shows "0 / 0".
* Projects: one day per project, at most 3 projects, 5 to 6 questions each. The days this frees or needs are
  balanced against DSA, which is the open-ended topic.
* DSA days hold up to 5 link cards. A DSA day without cards is filled later (Hynts / fallback list, see
  backfill.py); any day still empty after that is removed by `finalize`.
"""
import hashlib
from dataclasses import dataclass

DIFF_RANK = {"EASY": 0, "MEDIUM": 1, "HARD": 2}
QUESTIONS_PER_DAY = 5       # DSA link cards per day
MIN_PER_DAY = 2             # written questions: never fewer per day (unless the topic has only 1)
MAX_PER_DAY = 5             # written questions: never more per day
MAX_PROJECT_DAYS = 3
BASE_WEIGHTS = {"DSA": 4.0, "OOP": 2.0, "DBMS": 2.0, "OS": 1.5, "CN": 1.0, "HR": 1.5, "PROJECT": 1.5}
# Skills that, when the JD asks for them, raise the weight of a topic.
SKILL_TOPIC = {
    "sql": "DBMS", "data structures": "DSA", "java": "OOP", "c++": "OOP", "python": "OOP",
    "rest": "CN", "linux": "OS", "docker": "OS", "kubernetes": "OS", "aws": "CN",
}
DSA_DAY_DIRECTIVE = (
    "Solve at least 3 to 5 problems for this day. Make detailed notes of the logic, dry-run the code, "
    "and recognize the underlying algorithmic patterns."
)

# Topics whose order is shuffled per plan (the master list has no natural order).
SHUFFLED_TOPICS = {"OS", "DBMS", "CN", "OOP"}


@dataclass
class QuestionRef:
    id: str
    topic: str
    difficulty: str
    text: str
    position: int = 0  # keeps hand-ordered items (DSA link cards, project questions) in the order they were built
    group: str | None = None  # PROJECT: which project the question is about (one day per group)


def topic_weights(jd_skills: set[str], has_projects: bool) -> dict[str, float]:
    weights = dict(BASE_WEIGHTS)
    if not has_projects:
        weights.pop("PROJECT")
    for skill in jd_skills:
        topic = SKILL_TOPIC.get(skill)
        if topic in weights:
            weights[topic] += 1.0
    return weights


def allocate_days(weights: dict[str, float], days: int) -> dict[str, int]:
    """Largest-remainder split. With fewer days than topics, only the heaviest topics get a day."""
    ordered = sorted(weights, key=lambda t: (-weights[t], t))
    if days <= len(ordered):
        return {t: 1 for t in ordered[:days]}
    total = sum(weights.values())
    raw = {t: weights[t] / total * days for t in ordered}
    alloc = {t: max(1, int(raw[t])) for t in ordered}
    while sum(alloc.values()) < days:
        t = max(ordered, key=lambda x: (raw[x] - alloc[x], weights[x], x))
        alloc[t] += 1
    while sum(alloc.values()) > days:
        t = min((x for x in ordered if alloc[x] > 1), key=lambda x: (raw[x] - alloc[x], -weights[x], x))
        alloc[t] -= 1
    return alloc


def even_chunks(pool: list, days: int) -> list[list]:
    """Split `pool` over at most `days` days: 2 to 5 items each, sizes differing by at most one.
    Fewer days are used when there are not enough items for 2 per day; never an empty day."""
    if not pool or days <= 0:
        return []
    used = max(1, min(days, len(pool) // MIN_PER_DAY))
    take = pool[: used * MAX_PER_DAY]
    base, extra = divmod(len(take), used)
    out, i = [], 0
    for d in range(used):
        size = base + (1 if d < extra else 0)
        out.append(take[i: i + size])
        i += size
    return out


def _shuffle_key(seed: int, q: QuestionRef) -> str:
    return hashlib.sha256(f"{seed}:{q.id}".encode()).hexdigest()


def _project_groups(pool: list[QuestionRef]) -> list[list[QuestionRef]]:
    groups: dict[str, list[QuestionRef]] = {}
    for q in sorted(pool, key=lambda q: (q.position, q.text)):
        groups.setdefault(q.group or q.id, []).append(q)
    return list(groups.values())


def build_plan(
    questions: list[QuestionRef], weights: dict[str, float], days: int, seed: int | None = None
) -> dict:
    """Deterministic for the same inputs AND seed. With a seed, core topics are shuffled by it."""
    alloc = allocate_days(weights, days)
    by_topic: dict[str, list[QuestionRef]] = {}
    for q in sorted(questions, key=lambda q: (DIFF_RANK[q.difficulty], q.position, q.text)):
        by_topic.setdefault(q.topic, []).append(q)
    if seed is not None:
        for topic in SHUFFLED_TOPICS & by_topic.keys():
            by_topic[topic].sort(key=lambda q: _shuffle_key(seed, q))

    # Projects: exactly one day per project, at most 3; DSA absorbs the difference.
    projects = _project_groups(by_topic.get("PROJECT", []))[:MAX_PROJECT_DAYS]
    if "PROJECT" in alloc:
        want, have = len(projects), alloc["PROJECT"]
        if want > have and "DSA" in alloc:
            move = min(want - have, alloc["DSA"] - 1)  # take days from DSA, never all of them
            alloc["DSA"] -= move
            alloc["PROJECT"] += move
        elif want < have:
            alloc["PROJECT"] = want
            if "DSA" in alloc:
                alloc["DSA"] += have - want  # spare project days go to DSA practice

    plan_days: list[dict] = []
    for topic in sorted(alloc, key=lambda t: (-weights[t], t)):
        pool = by_topic.get(topic, [])
        n = alloc[topic]
        if topic == "DSA":
            # empty DSA days are kept for now: backfill.py fills them, finalize() drops any it could not
            for i in range(n):
                chunk = pool[i * QUESTIONS_PER_DAY: (i + 1) * QUESTIONS_PER_DAY]
                plan_days.append({"topic": topic, "question_ids": [q.id for q in chunk], "description": DSA_DAY_DIRECTIVE})
        elif topic == "PROJECT":
            for group in projects[:n]:
                plan_days.append({"topic": topic, "question_ids": [q.id for q in group[:6]]})
        else:
            for chunk in even_chunks(pool, n):
                plan_days.append({"topic": topic, "question_ids": [q.id for q in chunk]})
    for number, day in enumerate(plan_days, start=1):
        day["day"] = number
    with_items = {d["topic"] for d in plan_days if d["question_ids"]}
    return {
        "days": plan_days,
        "topic_weights": {t: weights[t] for t in alloc},
        # DSA is judged after backfill (finalize); other topics now
        "topics_without_questions": sorted(t for t in alloc if alloc[t] > 0 and t != "DSA" and t not in with_items),
    }


def finalize(plan: dict, duration_days: int) -> dict:
    """Drops days that are still empty (after DSA backfill), renumbers, and records how many of the
    requested days the plan actually uses. Mutates and returns `plan`."""
    allocated = {d["topic"] for d in plan["days"]}
    kept = [d for d in plan["days"] if d["question_ids"]]
    for number, day in enumerate(kept, start=1):
        day["day"] = number
    plan["days"] = kept
    have = {d["topic"] for d in kept}
    plan["topics_without_questions"] = sorted(set(plan.get("topics_without_questions", [])) | (allocated - have))
    plan["free_days"] = max(0, duration_days - len(kept))
    return plan
