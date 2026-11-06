import io
import json

import pytest
from pypdf import PdfReader

from app.ai.llm import LLMResponse, get_llm_client
from app.modules.resume import validator

JD = (
    "We are hiring a backend intern. You must know Python and FastAPI. "
    "Experience with Kubernetes is required. Docker is a plus. Knowledge of SQL is preferred."
)


def seed_profile(client):
    h = client.http
    v = h.get("/api/v1/me").json()["profile"]["version"]
    h.patch("/api/v1/profile", json={"expected_version": v, "display_name": "Asha Verma", "headline": "Backend student", "summary": "Student who likes APIs."})
    h.post("/api/v1/profile/skills", json={"name": "Python", "level": "ADVANCED"})
    h.post("/api/v1/profile/skills", json={"name": "SQL", "level": "BEGINNER"})
    h.post("/api/v1/profile/education", json={"institution": "Graphic Era University", "degree": "B.Tech"})
    h.post("/api/v1/profile/experience", json={
        "organization": "Acme", "title": "Intern",
        "description_points": ["built REST APIs with FastAPI and Python", "wrote unit tests"],
    })
    h.post("/api/v1/profile/projects", json={"title": "Tracker", "tech": ["Python", "React"], "description": "web app for applications"})


def review_all(client, vid: str, decision: str = "approved") -> None:
    """Clicks Approve (or Reject) on every item still waiting in the approval checklist."""
    v = client.http.get(f"/api/v1/resume/versions/{vid}").json()
    pending = {i["id"]: decision for i in v["review_items"] if i["review"] == "pending"}
    if pending:
        r = client.http.post(f"/api/v1/resume/versions/{vid}/review", json={"decisions": pending})
        assert r.status_code == 200, r.text


def make_analysis(client):
    jd = client.http.post("/api/v1/job-descriptions", json={"text": JD, "role_title": "Backend Intern", "company": "Acme"})
    assert jd.status_code == 201, jd.text
    r = client.http.post("/api/v1/resume/analyses", json={"jd_id": jd.json()["id"]})
    assert r.status_code == 201, r.text
    return r.json()


def test_jd_sanitised_and_deduped(client):
    r = client.http.post("/api/v1/job-descriptions", json={"text": "<script>alert(1)</script> " + JD})
    assert r.status_code == 201 and "<script>" not in r.json()["text"]
    again = client.http.post("/api/v1/job-descriptions", json={"text": "<script>alert(1)</script> " + JD})
    assert again.status_code == 200 and again.json()["id"] == r.json()["id"]
    assert client.http.post("/api/v1/job-descriptions", json={"text": "too short"}).status_code == 422


def test_analysis_matches_deterministically(client):
    seed_profile(client)
    a = make_analysis(client)
    status = {next(r["text"] for r in a["requirements"] if r["id"] == m["requirement_id"]): m["status"] for m in a["matches"]}
    assert status["python"] == "matched" and status["fastapi"] == "matched"
    assert status["kubernetes"] == "missing"
    assert status["sql"] == "partial"  # listed as beginner only, no usage evidence
    assert a["jd_quality"] == "ok" and a["stale"] is False


def test_ungrounded_requirements_dropped(app, client):
    class Liar:
        provider, model = "t", "t"

        def generate_json(self, req):
            return LLMResponse(text=json.dumps({"requirements": [
                {"text": "Python", "category": "skill", "importance": "must", "jd_quote": "must know Python"},
                {"text": "Blockchain", "category": "skill", "importance": "must", "jd_quote": "5 years of blockchain"},
            ]}))

    app.dependency_overrides[get_llm_client] = lambda: Liar()
    jd = client.http.post("/api/v1/job-descriptions", json={"text": JD}).json()
    a = client.http.post("/api/v1/resume/analyses", json={"jd_id": jd["id"]}).json()
    assert [r["text"] for r in a["requirements"]] == ["Python"]
    assert a["jd_quality"] == "low"


def test_full_journey_j2(client, tmp_path):
    seed_profile(client)
    a = make_analysis(client)
    v = client.http.post("/api/v1/resume/versions", json={"analysis_id": a["id"]})
    assert v.status_code == 201, v.text
    v = v.json()
    assert v["status"] == "DRAFT"
    assert v["content"]["skills"][0] == "Python"  # matched skills first
    assert [f["requirement"] for f in v["claim_flags"]] == ["kubernetes"]
    assert "Kubernetes" not in json.dumps(v["content"])  # never inserted
    vid = v["id"]

    # unresolved unverified claim blocks approval
    blocked = client.http.post(f"/api/v1/resume/versions/{vid}/approve")
    assert blocked.status_code == 409 and blocked.json()["error"]["code"] == "UNRESOLVED_CLAIMS"
    # cannot claim it has evidence when the profile has none
    assert client.http.post(f"/api/v1/resume/versions/{vid}/flags/f1/resolve", json={"resolution": "recheck"}).status_code == 409

    # accept a reword proposal
    for p in v["change_list"]:
        r = client.http.post(f"/api/v1/resume/versions/{vid}/proposals/{p['id']}/accept")
        assert r.status_code == 200
        got = client.http.get(f"/api/v1/resume/versions/{vid}").json()
        assert any(b["text"] == p["after"] and b.get("ai_assisted") for e in got["content"]["experience"] + got["content"]["projects"] for b in e["bullets"])

    client.http.post(f"/api/v1/resume/versions/{vid}/flags/f1/resolve", json={"resolution": "dismiss"})
    assert client.http.patch(f"/api/v1/resume/versions/{vid}", json={"summary": "Backend-focused student."}).status_code == 200
    review_all(client, vid)
    ok = client.http.post(f"/api/v1/resume/versions/{vid}/approve")
    assert ok.status_code == 200 and ok.json()["status"] == "APPROVED"

    # immutable once approved
    assert client.http.patch(f"/api/v1/resume/versions/{vid}", json={"title": "x"}).status_code == 409
    # PDF only for approved, and text is extractable (ATS check)
    pdf = client.http.post(f"/api/v1/resume/versions/{vid}/pdf")
    assert pdf.status_code == 200 and pdf.json()["has_pdf"]
    data = client.http.get(f"/api/v1/resume/versions/{vid}/pdf")
    assert data.headers["content-type"] == "application/pdf"
    text = "\n".join(p.extract_text() for p in PdfReader(io.BytesIO(data.content)).pages)
    for needle in ("ASHA VERMA", "GRAPHIC ERA UNIVERSITY", "FASTAPI", "SKILLS", "BACKEND-FOCUSED STUDENT."):
        assert needle in text.upper()

    # profile edit never silently changes the approved artefact; it is shown stale
    client.http.post("/api/v1/profile/skills", json={"name": "Go"})
    after = client.http.get(f"/api/v1/resume/versions/{vid}").json()
    assert after["stale"] is True and "Go" not in after["content"]["skills"]
    # stale analysis cannot seed a new draft
    assert client.http.post("/api/v1/resume/versions", json={"analysis_id": a["id"]}).status_code == 409


def test_pdf_requires_approval(client):
    seed_profile(client)
    v = client.http.post("/api/v1/resume/versions", json={}).json()
    assert v["claim_flags"] == []  # no JD, nothing to flag
    assert client.http.post(f"/api/v1/resume/versions/{v['id']}/pdf").status_code == 409


def test_diff_and_delete(client, tmp_path):
    seed_profile(client)
    v1 = client.http.post("/api/v1/resume/versions", json={}).json()
    v2 = client.http.post("/api/v1/resume/versions", json={}).json()
    bullet = v2["content"]["experience"][0]["bullets"][0]
    client.http.patch(f"/api/v1/resume/versions/{v2['id']}", json={"bullet_edits": {bullet["id"]: "Rewrote it myself"}})
    d = client.http.get(f"/api/v1/resume/versions/{v1['id']}/diff/{v2['id']}").json()
    assert d["changes"][0]["after"] == "Rewrote it myself"
    assert client.http.delete(f"/api/v1/resume/versions/{v1['id']}").status_code == 204
    assert client.http.get(f"/api/v1/resume/versions/{v1['id']}").status_code == 404


def test_isolation(client):
    seed_profile(client)
    a = make_analysis(client)
    v = client.http.post("/api/v1/resume/versions", json={"analysis_id": a["id"]}).json()
    jd_id = a["jd_id"]
    client.as_user("user-b")
    base = f"/api/v1/resume/versions/{v['id']}"
    for method, path in [("get", base), ("post", base + "/approve"), ("post", base + "/pdf"), ("get", base + "/pdf"),
                         ("delete", base), ("get", f"/api/v1/resume/analyses/{a['id']}"),
                         ("get", f"/api/v1/job-descriptions/{jd_id}"), ("delete", f"/api/v1/job-descriptions/{jd_id}")]:
        assert getattr(client.http, method)(path).status_code == 404, (method, path)
    assert client.http.post("/api/v1/resume/analyses", json={"jd_id": jd_id}).status_code == 404
    assert client.http.post("/api/v1/resume/versions", json={"analysis_id": a["id"]}).status_code == 404
    assert client.http.get("/api/v1/resume/versions").json() == []


def test_ai_down_still_builds_resume(app, client):
    seed_profile(client)
    a = make_analysis(client)

    class Down:
        provider, model = "t", "t"

        def generate_json(self, req):
            from app.ai.llm import LLMError

            raise LLMError("PROVIDER_ERROR")

    app.dependency_overrides[get_llm_client] = lambda: Down()
    r = client.http.post("/api/v1/resume/versions", json={"analysis_id": a["id"]}).json()
    assert r["change_list"] == [] and any("unavailable" in n for n in r["notes"])


# ---- adversarial validator set ------------------------------------------
BULLETS = {"b1": "Built REST APIs with FastAPI for 3 internal teams"}
FACTS = {"f1": "Built REST APIs with FastAPI for 3 internal teams", "f2": "Python"}


def _p(after, ev=("f1",), before=BULLETS["b1"], target="b1"):
    return validator.ProposalIn(target=target, kind="reword", before=before, after=after, evidence_ids=list(ev))


@pytest.mark.parametrize("after,reason", [
    ("Built REST APIs with FastAPI for 30 internal teams", "number"),
    ("Built REST APIs with FastAPI, improving latency by 40%", "number"),
    ("Built REST APIs with FastAPI and Kubernetes for 3 internal teams", "skill"),
    ("Built REST APIs with FastAPI at Google for 3 internal teams", "Google"),
    ("Led REST APIs built with FastAPI for 3 internal teams " + "api " * 5, "stuffing"),
    ("Built REST APIs with FastAPI for 3 internal teams. " + "x" * 400, "long"),
    ("Built REST APIs with FastAPI for 3 internal teams", "no change"),
])
def test_validator_blocks_invented_claims(after, reason):
    assert validator.reject_reason(_p(after), BULLETS, FACTS) is not None, reason


def test_validator_blocks_bad_evidence_and_targets():
    ok = "Developed REST APIs using FastAPI for 3 internal teams"
    assert validator.reject_reason(_p(ok), BULLETS, FACTS) is None
    assert validator.reject_reason(_p(ok, ev=()), BULLETS, FACTS)
    assert validator.reject_reason(_p(ok, ev=("nope",)), BULLETS, FACTS)
    assert validator.reject_reason(_p(ok, target="zzz"), BULLETS, FACTS)
    assert validator.reject_reason(_p(ok, before="something else"), BULLETS, FACTS)
