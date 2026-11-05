"""Phase 2 (resume -> approval queue with Approve all / Reject all) and Phase 4 (JD project swap suggestions)."""
import datetime as dt
import uuid

import pytest
from sqlalchemy import select

from app.db.models.coding import Repository
from app.integrations import platforms
from app.integrations.github import GithubResult
from app.modules.coding.router import get_github_fetcher, get_platform_fetcher
from tests.helpers import make_pdf, upload
from tests.test_resume_versions import JD, make_analysis, seed_profile

RESUME_WITH_LINKS = """Asha Verma
asha@example.com
github.com/ashav  leetcode.com/u/ashav  codechef.com/users/ashav_cc  hackerrank.com/profile/ashav_hr

Education
Graphic Era University
B.Tech Computer Science 2022 - 2026

Experience
Backend Intern - Acme Corp
- Built REST APIs with FastAPI and PostgreSQL

Projects
Placement Tracker
- Web app using Python and React for tracking applications

Skills
Python, FastAPI, SQL, Git
"""


def _platform_result(platform, username):
    return platforms.PlatformResult(
        raw={}, normalized={"platform": platform, "username": username, "profile_url": f"https://x.test/{username}",
                            "metrics": {"problems_solved_total": {"value": 10, "available": True}}, "warnings": []},
    )


@pytest.fixture()
def fakes(app):
    calls = []

    def platform_fetch(platform, username):
        calls.append((platform, username))
        if username == "ashav_cc":
            raise platforms.ConnectorError("NOT_FOUND", "That CodeChef username was not found.")
        return _platform_result(platform, username)

    def github_fetch(username):
        calls.append(("GITHUB", username))
        return GithubResult(raw={}, normalized={"platform": "GITHUB", "username": username, "profile_url": f"https://github.com/{username}",
                                                "metrics": {}, "languages": {}, "warnings": []}, repositories=[])

    app.dependency_overrides[get_platform_fetcher] = lambda: platform_fetch
    app.dependency_overrides[get_github_fetcher] = lambda: github_fetch
    return calls


def parse_resume(client, text=RESUME_WITH_LINKS):
    doc = upload(client, make_pdf(text)).json()
    r = client.http.post(f"/api/v1/resume/documents/{doc['id']}/parse")
    assert r.status_code == 200, r.text
    return r.json()


# ---- Phase 2 ---------------------------------------------------------------------------------------

def test_first_parse_queues_coding_links_and_basics_without_applying_anything(client, fakes):
    out = parse_resume(client)
    assert out["intake"]["created"] >= 4
    pending = client.http.get("/api/v1/intake").json()
    kinds = {(r["kind"], r["payload"].get("platform")) for r in pending["requests"]}
    assert {("CODING_ACCOUNT", "LEETCODE"), ("CODING_ACCOUNT", "CODECHEF"), ("CODING_ACCOUNT", "HACKERRANK"), ("CODING_ACCOUNT", "GITHUB")} <= kinds
    fields = {r["payload"]["field"]: r["payload"]["value"] for r in pending["requests"] if r["kind"] == "PROFILE_FIELD"}
    assert fields.get("display_name") == "Asha Verma" and fields.get("graduation_year") == "2026"
    assert fakes == []  # nothing was fetched or connected yet
    assert all(not a["connected"] for a in client.http.get("/api/v1/coding/dashboard").json())


def test_second_parse_is_not_a_first_parse(client, fakes):
    parse_resume(client)
    again = parse_resume(client, RESUME_WITH_LINKS + "\nAchievements\nWinner, hackathon\n")
    assert again["intake"]["created"] == 0
    assert len(client.http.get("/api/v1/intake").json()["requests"]) >= 4


def test_profile_fields_never_overwrite_existing_values(client, fakes):
    seed_profile(client)  # name and so on already filled in
    parse_resume(client)
    fields = [r["payload"]["field"] for r in client.http.get("/api/v1/intake").json()["requests"] if r["kind"] == "PROFILE_FIELD"]
    assert "display_name" not in fields


def test_approve_all_connects_accounts_fills_profile_and_keeps_failures_visible(client, fakes):
    parse_resume(client)
    # the existing import step queues resume sections as proposals
    doc_id = client.http.get("/api/v1/resume/documents").json()[0]["id"]
    parsed = client.http.get(f"/api/v1/resume/documents/{doc_id}/parsed").json()["parsed"]
    items = {s: [i["fields"] for i in parsed[s]] for s in ("education", "experience", "projects", "skills") if parsed.get(s)}
    client.http.post(f"/api/v1/resume/documents/{doc_id}/import", json={"items": items})
    before = client.http.get("/api/v1/intake").json()
    assert before["proposals"], "resume sections should be waiting as proposals"

    r = client.http.post("/api/v1/intake/approve-all")
    assert r.status_code == 200, r.text
    assert r.json()["failed"] == 1  # CodeChef username 'ashav_cc' is rejected by the fake connector
    dash = {a["platform"]: a for a in client.http.get("/api/v1/coding/dashboard").json()}
    assert dash["LEETCODE"]["connected"] and dash["HACKERRANK"]["connected"] and dash["GITHUB"]["connected"]
    assert not dash["CODECHEF"]["connected"]
    me = client.http.get("/api/v1/me").json()["profile"]
    assert me["display_name"] == "Asha Verma" and me["graduation_year"] == 2026
    after = client.http.get("/api/v1/intake").json()
    assert after["proposals"] == []
    failed = [x for x in after["requests"] if x["status"] == "FAILED"]
    assert len(failed) == 1 and "not found" in failed[0]["message"].lower()


def test_reject_all_applies_nothing(client, fakes):
    parse_resume(client)
    r = client.http.post("/api/v1/intake/reject-all")
    assert r.status_code == 200 and r.json()["rejected"] >= 4
    assert fakes == []
    assert client.http.get("/api/v1/intake").json()["total"] == 0
    assert all(not a["connected"] for a in client.http.get("/api/v1/coding/dashboard").json())
    assert client.http.get("/api/v1/me").json()["profile"]["display_name"] in (None, "")


def test_single_request_approve_reject_and_isolation(client, fakes):
    parse_resume(client)
    reqs = client.http.get("/api/v1/intake").json()["requests"]
    lc = next(r for r in reqs if r["payload"].get("platform") == "LEETCODE")
    gh = next(r for r in reqs if r["payload"].get("platform") == "GITHUB")
    assert client.http.post(f"/api/v1/intake/requests/{lc['id']}/approve").json()["status"] == "APPROVED"
    assert client.http.post(f"/api/v1/intake/requests/{gh['id']}/reject").json()["status"] == "REJECTED"
    assert client.http.post(f"/api/v1/intake/requests/{lc['id']}/approve").status_code == 409
    client.as_user("user-b")
    assert client.http.post(f"/api/v1/intake/requests/{gh['id']}/approve").status_code == 404
    assert client.http.get("/api/v1/intake").json()["total"] == 0


def test_link_collection_ignores_site_pages_that_are_not_profiles():
    from app.modules.intake import service

    found = service.find_accounts([
        "https://leetcode.com/problems/two-sum/", "https://leetcode.com/u/ashav/", "https://github.com/ashav/tracker",
        "https://github.com/ashav", "https://www.hackerrank.com/domains/python", "https://www.hackerrank.com/profile/ashav_hr",
    ])
    assert found == {"LEETCODE": "ashav", "GITHUB": "ashav", "HACKERRANK": "ashav_hr"}


# ---- Phase 4 ---------------------------------------------------------------------------------------

def _repo(db_factory, profile_id, name, readme, language="TypeScript", topics=(), fork=False):
    with db_factory() as db:
        db.add(Repository(profile_id=profile_id, external_id=str(uuid.uuid4().int)[:10], full_name=f"ashav/{name}", description=f"{name} app",
                          url=f"https://github.com/ashav/{name}", language=language, stars=0, topics=list(topics), is_fork=fork,
                          is_archived=False, fetched_at=dt.datetime.now(dt.timezone.utc), readme=readme))
        db.commit()


def _profile_id(client, session_factory):
    from app.db.models.profile import StudentProfile

    client.http.get("/api/v1/me")
    with session_factory() as db:
        return db.scalar(select(StudentProfile.id))


def _version_for_jd(client, jd_text):
    jd = client.http.post("/api/v1/job-descriptions", json={"text": jd_text, "role_title": "Frontend Intern", "company": "Acme"}).json()
    analysis = client.http.post("/api/v1/resume/analyses", json={"jd_id": jd["id"]}).json()
    r = client.http.post("/api/v1/resume/versions", json={"analysis_id": analysis["id"]})
    assert r.status_code == 201, r.text
    return r.json()


FRONTEND_JD = ("We are hiring a frontend intern. You must know React and CSS. Experience with Python is a plus. "
               "You will build responsive user interfaces and collaborate with designers on a product team.")


def test_swap_is_suggested_when_a_github_project_covers_missing_jd_skills(client, session_factory):
    seed_profile(client)  # one project, Tracker (Python, React) ... make it Python only for a clear gap
    pid = _profile_id(client, session_factory)
    projects = client.http.get("/api/v1/profile/projects").json()
    client.http.patch(f"/api/v1/profile/projects/{projects[0]['id']}", json={"tech": ["Python"], "description": "command line tool in Python"})
    _repo(session_factory, pid, "shop-ui", "# Shop UI\nA storefront built with React and styled with CSS.\n\n## Features\n- Responsive layout in CSS grid\n- React hooks")
    v = _version_for_jd(client, FRONTEND_JD)
    r = client.http.get(f"/api/v1/resume/versions/{v['id']}/swap-suggestions")
    assert r.status_code == 200, r.text
    s = r.json()["suggestions"]
    assert len(s) == 1
    assert s[0]["repo"]["full_name"] == "ashav/shop-ui" and s[0]["replace"]["title"] == "Tracker"
    assert {g["skill"].lower() for g in s[0]["gains"]} >= {"react", "css"}
    assert s[0]["message"] == "Swap existing project Tracker with GitHub project shop-ui to match JD requirements."
    assert any("React" in (g["evidence"] or "") for g in s[0]["gains"])


def test_no_suggestion_without_evidence_in_the_readme_or_for_forks_or_unhelpful_repos(client, session_factory):
    seed_profile(client)
    pid = _profile_id(client, session_factory)
    projects = client.http.get("/api/v1/profile/projects").json()
    client.http.patch(f"/api/v1/profile/projects/{projects[0]['id']}", json={"tech": ["Python"], "description": "command line tool"})
    _repo(session_factory, pid, "notes", "Plain notes with nothing relevant.", language="Go")
    _repo(session_factory, pid, "forked-ui", "React and CSS everywhere", fork=True)
    v = _version_for_jd(client, FRONTEND_JD)
    assert client.http.get(f"/api/v1/resume/versions/{v['id']}/swap-suggestions").json()["suggestions"] == []


def test_applying_a_swap_adds_the_project_to_the_profile_and_replaces_it_in_the_draft(client, session_factory):
    seed_profile(client)
    pid = _profile_id(client, session_factory)
    projects = client.http.get("/api/v1/profile/projects").json()
    client.http.patch(f"/api/v1/profile/projects/{projects[0]['id']}", json={"tech": ["Python"], "description": "command line tool in Python"})
    _repo(session_factory, pid, "shop-ui", "A storefront built with React and styled with CSS.")
    v = _version_for_jd(client, FRONTEND_JD)
    s = client.http.get(f"/api/v1/resume/versions/{v['id']}/swap-suggestions").json()["suggestions"][0]
    r = client.http.post(f"/api/v1/resume/versions/{v['id']}/swaps", json={"repo_id": s["repo"]["id"], "replace_project_id": s["replace"]["project_id"]})
    assert r.status_code == 200, r.text
    titles = [p["title"] for p in r.json()["content"]["projects"]]
    assert titles == ["shop-ui"]
    prof = {p["title"]: p for p in client.http.get("/api/v1/profile/projects").json()}
    assert "shop-ui" in prof and prof["shop-ui"]["source_type"] == "PLATFORM_VERIFIED"
    assert prof["shop-ui"]["links"] == ["https://github.com/ashav/shop-ui"]
    assert "Tracker" in prof  # the original project stays in the profile, only the draft changes
    assert r.json()["stale"] is False
    # the same repo is not suggested again, and cannot be swapped in twice
    assert client.http.get(f"/api/v1/resume/versions/{v['id']}/swap-suggestions").json()["suggestions"] == []
    again = client.http.post(f"/api/v1/resume/versions/{v['id']}/swaps", json={"repo_id": s["repo"]["id"], "replace_project_id": r.json()["new_project_id"]})
    assert again.status_code == 409


def test_swap_rejects_other_users_repos_approved_versions_and_unknown_projects(client, session_factory):
    seed_profile(client)
    pid = _profile_id(client, session_factory)
    _repo(session_factory, pid, "shop-ui", "React and CSS")
    v = _version_for_jd(client, FRONTEND_JD)
    repo_id = client.http.get("/api/v1/coding/repositories").json()[0]["id"]
    bad = client.http.post(f"/api/v1/resume/versions/{v['id']}/swaps", json={"repo_id": repo_id, "replace_project_id": "project:nope"})
    assert bad.status_code == 404
    client.as_user("user-b")
    assert client.http.post(f"/api/v1/resume/versions/{v['id']}/swaps", json={"repo_id": repo_id, "replace_project_id": "x"}).status_code == 404


def test_swap_suggestions_need_a_jd_based_version(client, session_factory):
    seed_profile(client)
    v = client.http.post("/api/v1/resume/versions", json={}).json()
    assert client.http.get(f"/api/v1/resume/versions/{v['id']}/swap-suggestions").json()["suggestions"] == []
