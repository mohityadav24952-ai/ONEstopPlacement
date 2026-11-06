"""Interview Prep overhaul: even distribution (no 0/0 days), DSA day directive, saved core answers,
strictly technical project questions (max 3 projects, 5-6 each)."""
import json

from app.ai.llm import LLMResponse, get_llm_client
from app.modules.interview import core_answers, planner, project_questions
from app.modules.interview.core_master import RAW, master_questions

S = "/api/v1/interview/sessions"


def _refs(topic: str, n: int) -> list[planner.QuestionRef]:
    return [planner.QuestionRef(f"{topic}{i}", topic, "EASY", f"{topic} q{i}") for i in range(n)]


# ---- distribution -------------------------------------------------------------------------------

def test_even_chunks_never_empty_and_2_to_5_per_day():
    for n_questions in range(1, 60):
        for days in range(1, 35):
            chunks = planner.even_chunks(list(range(n_questions)), days)
            assert 1 <= len(chunks) <= days
            sizes = [len(c) for c in chunks]
            assert all(s >= 1 for s in sizes) and max(sizes) <= 5 and max(sizes) - min(sizes) <= 1
            if n_questions >= 2:
                assert min(sizes) >= 2
            assert sum(sizes) == min(n_questions, len(chunks) * 5)


def test_oop_with_25_questions_over_32_days_is_truncated_not_empty():
    plan = planner.build_plan(_refs("OOP", 25), {"OOP": 1.0}, 32)
    sizes = [len(d["question_ids"]) for d in plan["days"]]
    assert len(sizes) == 12 and all(2 <= s <= 3 for s in sizes) and sum(sizes) == 25


def test_no_day_in_a_real_plan_is_empty(client):
    for days in (3, 14, 30, 60):
        s = client.http.post(S, json={"company": "Acme Unknown Co", "role": "SDE", "duration_days": days}).json()
        assert s["days"], days
        assert all(len(d["questions"]) > 0 for d in s["days"]), days
        assert [d["day"] for d in s["days"]] == list(range(1, len(s["days"]) + 1))
        for d in s["days"]:
            if d["topic"] in ("OOP", "DBMS", "OS", "CN", "HR"):
                assert 1 <= len(d["questions"]) <= 5


# ---- DSA directive ------------------------------------------------------------------------------

def test_dsa_days_carry_the_actionable_directive(client):
    s = client.http.post(S, json={"company": "Google", "role": "SDE", "duration_days": 14}).json()
    dsa = [d for d in s["days"] if d["topic"] == "DSA"]
    assert dsa and all(d["description"] == planner.DSA_DAY_DIRECTIVE for d in dsa)
    assert planner.DSA_DAY_DIRECTIVE.startswith("Solve at least 3 to 5 problems for this day.")
    assert all(d["description"] is None for d in s["days"] if d["topic"] != "DSA")


# ---- saved core answers -------------------------------------------------------------------------

def test_every_master_question_has_a_saved_answer():
    for topic, difficulty, text in master_questions():
        lines = core_answers.answer_for(text)
        assert lines and 2 <= len(lines) <= 6 and all(len(x) > 20 for x in lines), text
    data = json.loads(core_answers.PATH.read_text(encoding="utf-8"))
    assert len(data["answers"]) == sum(len(v) for v in RAW.values())


def test_core_cards_include_the_answer_with_no_api_call(client):
    s = client.http.post(S, json={"company": "Acme", "role": "SDE", "duration_days": 20}).json()
    core = [q for d in s["days"] if d["topic"] in ("OOP", "DBMS", "OS", "CN") for q in d["questions"]]
    assert core and all(q.get("answer") for q in core)
    assert all(core_answers.answer_for(q["original_text"]) == q["answer"] for q in core)


# ---- project questions --------------------------------------------------------------------------

def _seed_projects(client, n: int):
    for i in range(n):
        client.http.post("/api/v1/profile/projects", json={
            "title": f"Project{i}", "description": f"A web app number {i} with an API.", "tech": ["React", "Node.js", "MongoDB"]})


def test_projects_capped_at_3_days_with_5_to_6_technical_questions_each(client):
    _seed_projects(client, 5)
    s = client.http.post(S, json={"company": "Acme", "role": "SDE", "duration_days": 30}).json()
    proj = [d for d in s["days"] if d["topic"] == "PROJECT"]
    assert len(proj) == 3
    for i, d in enumerate(proj):
        assert 5 <= len(d["questions"]) <= 6
        assert all(f'"Project{i}"' in q["text"] for q in d["questions"])  # one project per day
        assert all(project_questions.is_technical(q["text"]) for q in d["questions"])


def test_one_project_gets_one_day(client):
    _seed_projects(client, 1)
    s = client.http.post(S, json={"company": "Acme", "role": "SDE", "duration_days": 30}).json()
    assert len([d for d in s["days"] if d["topic"] == "PROJECT"]) == 1


class _ProjectAI:
    provider, model = "t", "t"

    def __init__(self):
        self.calls = 0

    def generate_json(self, req):
        if req.workflow != "interview_project":
            return LLMResponse(text="{}", model="t")
        self.calls += 1
        pid = req.payload["projects"][0]["project_id"]
        qs = [
            "How did you demonstrate leadership while building this project?",            # behavioural: dropped
            "Tell me about a conflict with a teammate.",                                     # behavioural: dropped
            "How does the JWT authentication flow work between your React client and Node.js API?",
            "How did you index the MongoDB collections to keep the feed query fast?",
            "Where would your API become the bottleneck at 50,000 concurrent users, and how would you cache it?",
            "How does your API handle invalid input and exceptions?",
            "How does your API handle invalid input and exceptions?",                        # duplicate: dropped
        ]
        return LLMResponse(text=json.dumps({"projects": [{"project_id": pid, "questions": [{"text": q, "difficulty": "HARD"} for q in qs]}]}), model="t")


def test_ai_project_questions_are_filtered_topped_up_and_reused(app, client):
    ai = _ProjectAI()
    app.dependency_overrides[get_llm_client] = lambda: ai
    _seed_projects(client, 1)
    s = client.http.post(S, json={"company": "Acme", "role": "SDE", "duration_days": 20}).json()
    qs = [q for d in s["days"] if d["topic"] == "PROJECT" for q in d["questions"]]
    texts = [q["text"] for q in qs]
    assert 5 <= len(qs) <= 6
    assert not any("leadership" in t.lower() or "conflict" in t.lower() for t in texts)
    assert sum(1 for q in qs if q["provenance_type"] == "AI_GENERATED") == 4
    assert len(set(texts)) == len(texts)
    client.http.post(S, json={"company": "Other", "role": "SDE", "duration_days": 20})
    assert ai.calls == 1  # the second plan reused the saved questions: no new API call


def test_behavioural_filter_and_templates():
    assert not project_questions.is_technical("How did you demonstrate leadership in this project?")
    assert not project_questions.is_technical("What are your strengths and weaknesses?")
    assert project_questions.is_technical("How did you design the database schema and indexes?")
    for i in range(3):
        t = project_questions.templates("X", ["Go"], i)
        assert len(t) == 6 and all(project_questions.is_technical(q) for _, q in t)
    assert project_questions.templates("X", [], 0) != project_questions.templates("X", [], 1)
    assert len(project_questions.REFERENCE_QUESTIONS) == 25
