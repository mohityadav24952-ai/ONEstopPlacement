"""Deterministic preparation planner: same inputs always give the same plan."""
from dataclasses import dataclass

DIFF_RANK = {"EASY": 0, "MEDIUM": 1, "HARD": 2}
QUESTIONS_PER_DAY = 5
BASE_WEIGHTS = {"DSA": 4.0, "OOP": 2.0, "DBMS": 2.0, "OS": 1.5, "CN": 1.0, "HR": 1.5, "PROJECT": 1.5}
# Skills that, when the JD asks for them, raise the weight of a topic.
SKILL_TOPIC = {
    "sql": "DBMS", "data structures": "DSA", "java": "OOP", "c++": "OOP", "python": "OOP",
    "rest": "CN", "linux": "OS", "docker": "OS", "kubernetes": "OS", "aws": "CN",
}


@dataclass
class QuestionRef:
    id: str
    topic: str
    difficulty: str
    text: str


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


def build_plan(
    questions: list[QuestionRef], weights: dict[str, float], days: int
) -> dict:
    alloc = allocate_days(weights, days)
    by_topic: dict[str, list[QuestionRef]] = {}
    for q in sorted(questions, key=lambda q: (DIFF_RANK[q.difficulty], q.text)):
        by_topic.setdefault(q.topic, []).append(q)

    plan_days: list[dict] = []
    for topic in sorted(alloc, key=lambda t: (-weights[t], t)):
        pool = by_topic.get(topic, [])
        n = alloc[topic]
        for i in range(n):
            chunk = pool[i * QUESTIONS_PER_DAY : (i + 1) * QUESTIONS_PER_DAY]
            plan_days.append({"topic": topic, "question_ids": [q.id for q in chunk]})
    for number, day in enumerate(plan_days, start=1):
        day["day"] = number
    empty = sorted({d["topic"] for d in plan_days if not d["question_ids"]})
    return {
        "days": plan_days,
        "topic_weights": {t: weights[t] for t in alloc},
        "topics_without_questions": empty,
    }
