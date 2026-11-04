import json

from app.ai.llm import LLMResponse, get_llm_client
from app.modules.interview import planner
from app.modules.interview.router import GenQuestion, clean_generated

BODY = {"company": "Acme", "role": "Backend Intern", "duration_days": 7}


def test_allocate_days_properties():
    w = planner.topic_weights(set(), True)
    for days in (1, 3, 7, 14, 60):
        alloc = planner.allocate_days(w, days)
        assert sum(alloc.values()) == days or days < len(w)
        assert all(v >= 1 for v in alloc.values())
    assert list(planner.allocate_days(w, 1)) == ["DSA"]  # heaviest topic first


def test_planner_is_deterministic():
    qs = [planner.QuestionRef(str(i), "DSA", "EASY", f"q{i}") for i in range(12)]
    w = {"DSA": 4.0, "HR": 1.0}
    assert planner.build_plan(qs, w, 5) == planner.build_plan(list(reversed(qs)), w, 5)


def test_session_without_jd_and_with_progress(client):
    r = client.http.post("/api/v1/interview/sessions", json=BODY)
    assert r.status_code == 201, r.text
    s = r.json()
    assert s["used_jd"] is False and len(s["days"]) == 7
    first = s["days"][0]["questions"][0]
    assert first["provenance_type"] == "CURATED" and first["provenance_label"]
    assert first["sources"][0]["license_note"]
    assert "Acme" in s["note"] and "None is claimed" in s["note"]
    assert s["progress"]["percent_done"] == 0

    up = client.http.put(f"/api/v1/interview/sessions/{s['id']}/questions/{first['id']}", json={"state": "DONE", "notes": "easy"})
    assert up.status_code == 200 and up.json()["progress"]["done"] == 1
    again = client.http.get(f"/api/v1/interview/sessions/{s['id']}").json()
    assert again["days"][0]["questions"][0]["notes"] == "easy"
    assert client.http.put(f"/api/v1/interview/sessions/{s['id']}/questions/{first['id']}", json={"state": "BOGUS"}).status_code == 422


def test_same_inputs_same_plan(client):
    a = client.http.post("/api/v1/interview/sessions", json=BODY).json()
    b = client.http.post("/api/v1/interview/sessions", json=BODY).json()
    strip = lambda s: [[q["id"] for q in d["questions"]] for d in s["days"]]
    assert strip(a) == strip(b)


def test_jd_shifts_emphasis_and_reports_gaps(client):
    client.http.post("/api/v1/profile/skills", json={"name": "Python"})
    jd = client.http.post("/api/v1/job-descriptions", json={"text": "You must know SQL, Docker and Kubernetes. Python is a plus for this backend role."}).json()
    s = client.http.post("/api/v1/interview/sessions", json={**BODY, "jd_id": jd["id"]}).json()
    assert s["used_jd"] is True
    gaps = {g["skill"] for g in s["gaps"]}
    assert {"sql", "docker", "kubernetes"} <= gaps and "python" not in gaps
    plain = client.http.post("/api/v1/interview/sessions", json=BODY).json()
    topics = lambda x: [d["topic"] for d in x["days"]]
    assert topics(s).count("DBMS") >= topics(plain).count("DBMS")


def test_project_questions_come_from_own_projects(client):
    client.http.post("/api/v1/profile/projects", json={"title": "Tracker", "tech": ["Python"]})
    s = client.http.post("/api/v1/interview/sessions", json={**BODY, "duration_days": 10}).json()
    proj = [q for d in s["days"] if d["topic"] == "PROJECT" for q in d["questions"]]
    assert proj and all("Tracker" in q["text"] for q in proj)
    client.as_user("user-b")
    s2 = client.http.post("/api/v1/interview/sessions", json={**BODY, "duration_days": 10}).json()
    assert all(d["topic"] != "PROJECT" for d in s2["days"])  # nobody else's projects leak


def test_ai_questions_always_labelled_ai(client):
    s = client.http.post("/api/v1/interview/sessions", json=BODY).json()
    r = client.http.post(f"/api/v1/interview/sessions/{s['id']}/generate", json={"topic": "DSA", "count": 2})
    assert r.status_code == 201, r.text
    ai = [q for d in r.json()["days"] for q in d["questions"] if q["provenance_type"] == "AI_GENERATED"]
    assert len(ai) == 2 and all("AI-generated" in q["provenance_label"] for q in ai)
    assert client.http.post(f"/api/v1/interview/sessions/{s['id']}/generate", json={"topic": "DSA", "count": 99}).status_code == 422
    # AI rows are private to their owner
    client.as_user("user-b")
    ids = {q["id"] for q in client.http.get("/api/v1/interview/questions?provenance=AI_GENERATED").json()}
    assert not ids & {q["id"] for q in ai}


def test_company_claims_and_duplicates_stripped_by_code(app, client):
    class Sneaky:
        provider, model = "t", "t"

        def generate_json(self, req):
            return LLMResponse(text=json.dumps({"questions": [
                {"text": "Acme asked this exact question: explain a mutex in detail please.", "difficulty": "HARD"},
                {"text": "This was asked at a top company: explain deadlock briefly.", "difficulty": "HARD"},
                {"text": "Explain how a hash map handles collisions in practice.", "difficulty": "BOGUS"},
                {"text": "Explain how a hash map handles collisions in practice.", "difficulty": "EASY"},
            ]}))

    app.dependency_overrides[get_llm_client] = lambda: Sneaky()
    s = client.http.post("/api/v1/interview/sessions", json=BODY).json()
    out = client.http.post(f"/api/v1/interview/sessions/{s['id']}/generate", json={"topic": "DSA", "count": 5})
    # the BOGUS difficulty violates the schema twice -> safe failure, nothing stored
    assert out.status_code == 502
    assert out.json()["error"]["code"] == "AI_OUTPUT_INVALID"


def test_clean_generated_unit():
    items = [GenQuestion(text="Acme asked this exact question about mutexes."),
             GenQuestion(text="This was reported by candidates at interviews: explain deadlock."),
             GenQuestion(text="Explain how a hash map handles collisions in practice."),
             GenQuestion(text="Explain how a hash map handles collisions in practice!")]
    kept = clean_generated(items, "Acme", set(), 5)
    assert [k.text for k in kept] == ["Explain how a hash map handles collisions in practice."]


def test_question_search_filters_and_pagination(client):
    r = client.http.get("/api/v1/interview/questions?topic=DBMS&difficulty=EASY").json()
    assert r and all(q["topic"] == "DBMS" and q["difficulty"] == "EASY" for q in r)
    found = client.http.get("/api/v1/interview/questions?q=deadlock").json()
    assert found and all("deadlock" in q["text"].lower() for q in found)
    assert len(client.http.get("/api/v1/interview/questions?limit=3").json()) == 3
    assert client.http.get("/api/v1/interview/questions?limit=500").status_code == 422
    assert client.http.get("/api/v1/interview/questions?topic=NOPE").status_code == 422


def test_report_question_and_rate_limit(client):
    q = client.http.get("/api/v1/interview/questions?limit=1").json()[0]
    assert client.http.post(f"/api/v1/interview/questions/{q['id']}/report", json={"reason": "Answer is wrong"}).status_code == 201
    assert client.http.post(f"/api/v1/interview/questions/{q['id']}/report", json={"reason": "x"}).status_code == 422
    for _ in range(19):
        client.http.post(f"/api/v1/interview/questions/{q['id']}/report", json={"reason": "spam spam"})
    assert client.http.post(f"/api/v1/interview/questions/{q['id']}/report", json={"reason": "again"}).status_code == 429


def test_session_isolation_and_delete(client):
    s = client.http.post("/api/v1/interview/sessions", json=BODY).json()
    qid = s["days"][0]["questions"][0]["id"]
    client.as_user("user-b")
    base = f"/api/v1/interview/sessions/{s['id']}"
    assert client.http.get(base).status_code == 404
    assert client.http.put(f"{base}/questions/{qid}", json={"state": "DONE"}).status_code == 404
    assert client.http.post(f"{base}/generate", json={"topic": "DSA"}).status_code == 404
    assert client.http.delete(base).status_code == 404
    assert client.http.get("/api/v1/interview/sessions").json() == []
    client.as_user("user-a")
    assert client.http.delete(base).status_code == 204
    assert client.http.get(base).status_code == 404


def test_validation(client):
    assert client.http.post("/api/v1/interview/sessions", json={**BODY, "duration_days": 0}).status_code == 422
    assert client.http.post("/api/v1/interview/sessions", json={**BODY, "duration_days": 61}).status_code == 422
    assert client.http.post("/api/v1/interview/sessions", json={"role": "x", "duration_days": 3}).status_code == 422
    assert client.http.post("/api/v1/interview/sessions", json={**BODY, "jd_id": "00000000-0000-0000-0000-000000000000"}).status_code == 404
