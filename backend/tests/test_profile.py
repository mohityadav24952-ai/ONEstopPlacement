import pytest

SECTION_SAMPLES = {
    "education": {"institution": "Graphic Era", "degree": "B.Tech"},
    "experience": {"organization": "Acme", "title": "Intern"},
    "achievements": {"title": "Hackathon winner", "type": "COMPETITION"},
    "skills": {"name": "Python"},
    "projects": {"title": "Placement app", "tech": ["FastAPI"]},
}
EDIT_KEY = {
    "education": "institution",
    "experience": "organization",
    "achievements": "title",
    "skills": "name",
    "projects": "title",
}


def test_requires_auth(app):
    from fastapi.testclient import TestClient

    r = TestClient(app).get("/api/v1/me")
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "UNAUTHORIZED"


def test_me_creates_profile(client):
    r = client.http.get("/api/v1/me")
    assert r.status_code == 200
    body = r.json()
    assert body["profile"]["version"] == 1
    assert body["completeness"]["percent"] == 0


def test_profile_patch_and_version_conflict(client):
    r = client.http.patch(
        "/api/v1/profile", json={"expected_version": 1, "display_name": "Asha"}
    )
    assert r.status_code == 200 and r.json()["version"] == 2
    stale = client.http.patch(
        "/api/v1/profile", json={"expected_version": 1, "display_name": "X"}
    )
    assert stale.status_code == 409
    assert stale.json()["error"]["code"] == "VERSION_CONFLICT"


def test_unknown_and_identity_fields_rejected(client):
    r = client.http.patch(
        "/api/v1/profile", json={"expected_version": 1, "user_id": "x"}
    )
    assert r.status_code == 422
    r = client.http.post(
        "/api/v1/profile/skills",
        json={"name": "Go", "verification_state": "PLATFORM_VERIFIED"},
    )
    assert r.status_code == 422


@pytest.mark.parametrize("section", SECTION_SAMPLES)
def test_section_crud(client, section):
    base = f"/api/v1/profile/{section}"
    created = client.http.post(base, json=SECTION_SAMPLES[section])
    assert created.status_code == 201, created.text
    item = created.json()
    assert item["source_type"] == "USER_ENTERED"
    assert item["verification_state"] == "UNVERIFIED"
    assert len(client.http.get(base).json()) == 1
    key = EDIT_KEY[section]
    patched = client.http.patch(f"{base}/{item['id']}", json={key: "Changed"})
    assert patched.status_code == 200, patched.text
    assert patched.json()[key] == "Changed"
    assert client.http.delete(f"{base}/{item['id']}").status_code == 204
    assert client.http.get(base).json() == []


@pytest.mark.parametrize("section", SECTION_SAMPLES)
def test_cross_user_access_fails_closed(client, section):
    base = f"/api/v1/profile/{section}"
    item = client.http.post(base, json=SECTION_SAMPLES[section]).json()
    client.as_user("user-b")
    assert client.http.get(base).json() == []
    assert client.http.patch(f"{base}/{item['id']}", json={}).status_code == 404
    assert client.http.delete(f"{base}/{item['id']}").status_code == 404
    client.as_user("user-a")
    assert len(client.http.get(base).json()) == 1


def test_duplicate_skill_conflict(client):
    client.http.post("/api/v1/profile/skills", json={"name": "Python"})
    r = client.http.post("/api/v1/profile/skills", json={"name": " python "})
    assert r.status_code == 409


def test_validation(client):
    r = client.http.post(
        "/api/v1/profile/achievements", json={"title": "x", "url": "http://bad"}
    )
    assert r.status_code == 422
    assert client.http.get("/api/v1/profile/nonsense").status_code == 422


def _proposal(session_factory, section, payload):
    from app.db.models.profile import StudentProfile
    from app.modules.profile import service

    db = session_factory()
    profile = db.query(StudentProfile).one()
    p = service.create_proposal(db, profile, section, "create", payload)
    pid = str(p.id)
    db.close()
    return pid


def test_proposals_apply_only_after_approval(client, session_factory):
    client.http.get("/api/v1/me")
    pid = _proposal(session_factory, "skills", {"name": "Docker"})

    pending = client.http.get("/api/v1/profile/proposals").json()
    assert len(pending) == 1
    assert client.http.get("/api/v1/profile/skills").json() == []  # not applied yet

    client.as_user("user-b")
    assert client.http.get("/api/v1/profile/proposals").json() == []
    assert (
        client.http.post(f"/api/v1/profile/proposals/{pid}/approve").status_code == 404
    )

    client.as_user("user-a")
    ok = client.http.post(f"/api/v1/profile/proposals/{pid}/approve")
    assert ok.status_code == 200
    skills = client.http.get("/api/v1/profile/skills").json()
    assert skills[0]["source_type"] == "AI_SUGGESTED"
    assert skills[0]["verification_state"] == "USER_CONFIRMED"
    again = client.http.post(f"/api/v1/profile/proposals/{pid}/approve")
    assert again.status_code == 409


def test_stale_proposal_blocked_and_reject_never_applies(client, session_factory):
    client.http.get("/api/v1/me")
    pid1 = _proposal(session_factory, "skills", {"name": "Rust"})
    pid2 = _proposal(session_factory, "skills", {"name": "Go"})

    client.http.post("/api/v1/profile/skills", json={"name": "Java"})  # bumps version
    r = client.http.post(f"/api/v1/profile/proposals/{pid1}/approve")
    assert r.status_code == 409 and r.json()["error"]["code"] == "PROFILE_CHANGED"
    assert client.http.post(f"/api/v1/profile/proposals/{pid2}/reject").status_code == 200
    names = [s["name"] for s in client.http.get("/api/v1/profile/skills").json()]
    assert names == ["Java"]
