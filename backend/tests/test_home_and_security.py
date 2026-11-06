import logging
import re
import uuid

import pytest
from fastapi.testclient import TestClient

from app.modules.home import router as home
from tests.helpers import RESUME_TEXT, make_pdf, upload
from tests.test_resume_versions import JD, review_all, seed_profile


# ---- Home / integration --------------------------------------------------
def test_home_for_new_user_points_to_profile_first(client):
    h = client.http.get("/api/v1/home").json()
    assert h["unavailable"] == []
    assert h["next_actions"][0]["id"] == "complete-profile"
    assert len(h["next_actions"]) <= 4


def test_home_reflects_modules_and_staleness(client):
    seed_profile(client)
    client.http.put("/api/v1/coding/accounts/LEETCODE/manual", json={"username": "a", "stars": 3})
    jd = client.http.post("/api/v1/job-descriptions", json={"text": JD}).json()
    a = client.http.post("/api/v1/resume/analyses", json={"jd_id": jd["id"]}).json()
    v = client.http.post("/api/v1/resume/versions", json={"analysis_id": a["id"]}).json()
    client.http.post(f"/api/v1/resume/versions/{v['id']}/flags/f1/resolve", json={"resolution": "dismiss"})
    review_all(client, v["id"])
    assert client.http.post(f"/api/v1/resume/versions/{v['id']}/approve").status_code == 200
    client.http.post("/api/v1/profile/skills", json={"name": "Go"})  # profile changes after approval

    h = client.http.get("/api/v1/home").json()
    assert h["resume"]["approved"] == 1 and h["resume"]["stale_approved"] == 1
    assert h["coding"]["connected"] == 1
    assert "update-resume" in [a["id"] for a in h["next_actions"]]
    # the approved artefact itself is untouched
    assert "Go" not in client.http.get(f"/api/v1/resume/versions/{v['id']}").json()["content"]["skills"]


def test_one_failing_module_does_not_block_home(client, monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("db exploded")

    monkeypatch.setattr(home, "coding_summary", boom)
    r = client.http.get("/api/v1/home")
    assert r.status_code == 200
    body = r.json()
    assert body["unavailable"] == ["coding"] and body["coding"] is None
    assert body["profile"] is not None and body["resume"] is not None


# ---- Authorisation sweep ---------------------------------------------------
# Deliberately public: the published portfolio page anyone can visit (see test_site_builder.py, which
# checks it serves only published portfolios and never the phone number).
PUBLIC_ROUTES = {"/api/v1/portfolio-site/public/{handle}"}


def test_every_product_route_requires_auth(app):
    anon = TestClient(app, raise_server_exceptions=False)
    checked = 0
    for path, ops in app.openapi()["paths"].items():
        if not path.startswith("/api/v1") or path in PUBLIC_ROUTES:
            continue
        url = re.sub(r"\{[^}]+\}", str(uuid.uuid4()), path)
        for method in ops:
            r = anon.request(method.upper(), url)
            assert r.status_code == 401, (method, path, r.status_code)
            checked += 1
    assert checked > 60  # guards against the sweep silently matching nothing


def test_health_is_public_and_headers_are_set(app):
    r = TestClient(app).get("/health")
    assert r.status_code == 200
    assert r.headers["x-content-type-options"] == "nosniff" and r.headers["x-frame-options"] == "DENY"


def test_api_responses_not_cacheable(client):
    r = client.http.get("/api/v1/me")
    assert r.headers["cache-control"] == "no-store"


# ---- Rate limits -------------------------------------------------------------
def test_upload_rate_limited(client):
    codes = [upload(client, make_pdf(RESUME_TEXT + f"\nLine {i}")).status_code for i in range(11)]
    assert codes[-1] == 429 and set(codes[:-1]) == {201}
    client.as_user("user-b")  # limits are per user
    assert upload(client, make_pdf()).status_code == 201


def test_ai_endpoint_rate_limited(client):
    s = client.http.post("/api/v1/interview/sessions", json={"company": "A", "role": "B", "duration_days": 3}).json()
    codes = [client.http.post(f"/api/v1/interview/sessions/{s['id']}/generate", json={"topic": "DSA", "count": 1}).status_code for _ in range(21)]
    assert codes[-1] == 429


# ---- Log review ------------------------------------------------------------
def test_no_resume_text_jd_or_tokens_in_logs(client, caplog):
    caplog.set_level(logging.DEBUG)
    secret = "ZEBRAFISH-PRIVATE-9931"
    doc = upload(client, make_pdf(RESUME_TEXT + f"\nProjects\n{secret}\n")).json()
    client.http.post(f"/api/v1/resume/documents/{doc['id']}/parse")
    client.http.post("/api/v1/job-descriptions", json={"text": JD + " " + secret})
    joined = "\n".join(r.getMessage() for r in caplog.records)
    assert secret not in joined and "asha@example.com" not in joined and "Bearer" not in joined


# ---- Account export and deletion -----------------------------------------------
def test_export_my_data(client):
    seed_profile(client)
    data = client.http.post("/api/v1/me/export").json()
    assert data["profile"]["display_name"] == "Asha Verma"
    assert data["sections"]["skills"][0]["name"] == "Python"


def test_delete_account_removes_everything(client, session_factory, tmp_path):
    seed_profile(client)
    upload(client, make_pdf())
    client.http.post("/api/v1/interview/sessions", json={"company": "A", "role": "B", "duration_days": 3})
    v = client.http.post("/api/v1/resume/versions", json={}).json()
    review_all(client, v["id"])
    client.http.post(f"/api/v1/resume/versions/{v['id']}/approve")
    client.http.post(f"/api/v1/resume/versions/{v['id']}/pdf")
    client.as_user("user-b")
    client.http.post("/api/v1/profile/skills", json={"name": "Rust"})
    client.as_user("user-a")

    assert client.http.request("DELETE", "/api/v1/me", json={"confirm": "yes"}).status_code == 422
    assert client.http.request("DELETE", "/api/v1/me", json={"confirm": "DELETE MY ACCOUNT"}).status_code == 204

    from sqlalchemy import text

    db = session_factory()
    for table in ("users", "student_profiles", "skills", "resume_documents", "resume_versions", "preparation_sessions", "ai_runs"):
        remaining = db.execute(text(f"select count(*) from {table}")).scalar()
        assert remaining == (1 if table in ("users", "student_profiles", "skills") else 0), table  # only user-b's rows left
    db.close()
    assert not [p for p in (tmp_path / "files").rglob("*") if p.is_file()]  # stored files gone
    client.as_user("user-b")
    assert [s["name"] for s in client.http.get("/api/v1/profile/skills").json()] == ["Rust"]
