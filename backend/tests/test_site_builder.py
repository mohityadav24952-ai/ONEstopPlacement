"""Portfolio Site Builder: handles, saving, resume parsing, live enrichment (mocked), public pages."""
import io

import httpx
import pytest
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from app.modules.site_builder import enrichment, parser
from app.modules.site_builder.router import reset_public_limits

BASE = "/api/v1/portfolio-site"

RESUME = """Asha Verma
asha.verma@example.com  +91 98765 43210
github.com/ashav   leetcode.com/u/ashav

Education
B.Tech Computer Science | Graphic Era University | 2024 - 2028
CGPA: 8.7/10

Experience
Backend Intern | Acme Corp | Jun 2025 - Aug 2025
- Built REST APIs with FastAPI and PostgreSQL
- Wrote unit tests with pytest

Projects
Placement Tracker | Python, React, FastAPI
- Web app for tracking applications https://tracker.example.com

Skills
Languages: Python, C++, SQL
Frameworks: FastAPI, React
Core CS: Data Structures, OS

Achievements
- Winner, Smart India Hackathon internal round
"""


def make_pdf(text: str = RESUME, link: str | None = None) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4, invariant=1)
    y = 800
    for line in text.splitlines():
        c.drawString(40, y, line)
        y -= 16
    if link:
        c.linkURL(link, (40, 780, 200, 795), relative=0)
    c.save()
    return buf.getvalue()


@pytest.fixture(autouse=True)
def _limits():
    reset_public_limits()


def claim(client, handle="asha-dev"):
    r = client.http.post(f"{BASE}/claim-handle", json={"handle": handle, "acceptedTerms": True})
    assert r.status_code == 200, r.text
    return r.json()


# ---- handles ----------------------------------------------------------------------------------------

def test_check_handle_format_reserved_and_available(client):
    h = client.http
    assert h.get(f"{BASE}/check-handle", params={"handle": "ab"}).json()["available"] is False
    assert h.get(f"{BASE}/check-handle", params={"handle": "Bad_Handle"}).json()["available"] is False
    assert h.get(f"{BASE}/check-handle", params={"handle": "admin"}).json()["message"] == "That name is reserved."
    ok = h.get(f"{BASE}/check-handle", params={"handle": "asha-dev"}).json()
    assert ok["available"] is True and ok["handle"] == "asha-dev"


def test_claim_requires_terms_and_blocks_taken_handles(client):
    r = client.http.post(f"{BASE}/claim-handle", json={"handle": "asha-dev", "acceptedTerms": False})
    assert r.status_code == 422 and r.json()["error"]["code"] == "TERMS_REQUIRED"
    claim(client)
    client.as_user("user-b")
    taken = client.http.get(f"{BASE}/check-handle", params={"handle": "asha-dev"}).json()
    assert taken["available"] is False and taken["message"] == "This username is already taken."
    r = client.http.post(f"{BASE}/claim-handle", json={"handle": "ASHA-DEV", "acceptedTerms": True})
    assert r.status_code == 409


def test_claim_seeds_from_profile_without_inventing_stats(client):
    data = claim(client)
    assert data["config"]["handle"] == "asha-dev" and data["config"]["isPublished"] is False
    assert data["basics"]["email"] == "user-a@example.com"
    assert data["codingStats"] == {} and data["projects"] == []


def test_owner_can_rename_their_own_handle(client):
    claim(client)
    assert client.http.get(f"{BASE}/check-handle", params={"handle": "asha-dev"}).json()["available"] is True
    assert claim(client, "asha-two")["config"]["handle"] == "asha-two"


# ---- save / read --------------------------------------------------------------------------------------

def test_me_requires_a_claimed_handle(client):
    r = client.http.get(f"{BASE}/me")
    assert r.status_code == 404 and r.json()["error"]["code"] == "NO_PORTFOLIO"


def test_put_me_saves_config_and_content_and_keeps_the_handle(client):
    data = claim(client)
    data["config"].update(templateId="devos", themeMode="light", accentColor="violet", mascotId="coder-cat", handle="hacked")
    data["basics"]["fullName"] = "Asha Verma"
    data["projects"] = [{"id": "p1", "title": "Tracker", "techStack": ["Python"], "featured": True}]
    r = client.http.put(f"{BASE}/me", json=data)
    assert r.status_code == 200, r.text
    got = client.http.get(f"{BASE}/me").json()
    assert got["config"]["handle"] == "asha-dev"
    assert (got["config"]["templateId"], got["config"]["themeMode"], got["config"]["mascotId"]) == ("devos", "light", "coder-cat")
    assert got["projects"][0]["title"] == "Tracker"


@pytest.mark.parametrize("bad", ["javascript:alert(1)", "data:text/html,x", "ftp://x.test/a", "https://a b.test"])
def test_put_me_rejects_unsafe_links(client, bad):
    data = claim(client)
    data["projects"] = [{"id": "p1", "title": "x", "liveUrl": bad}]
    assert client.http.put(f"{BASE}/me", json=data).status_code == 422


def test_put_me_rejects_unknown_template(client):
    data = claim(client)
    data["config"]["templateId"] = "nope"
    assert client.http.put(f"{BASE}/me", json=data).status_code == 422


# ---- public page --------------------------------------------------------------------------------------

def test_public_page_only_serves_published_and_hides_phone(client):
    data = claim(client)
    assert client.http.get(f"{BASE}/public/asha-dev").status_code == 404  # private by default
    data["config"]["isPublished"] = True
    data["basics"].update(fullName="Asha", phone="+91 99999 00000")
    client.http.put(f"{BASE}/me", json=data)
    client.as_user("visitor")
    r = client.http.get(f"{BASE}/public/ASHA-dev")  # case-insensitive, no ownership needed
    assert r.status_code == 200
    assert r.json()["basics"]["fullName"] == "Asha" and r.json()["basics"].get("phone") is None
    client.as_user("user-a")
    assert client.http.get(f"{BASE}/public/nobody").status_code == 404


def test_public_endpoint_needs_no_sign_in(app, client):
    data = claim(client)
    data["config"]["isPublished"] = True
    client.http.put(f"{BASE}/me", json=data)
    from fastapi.testclient import TestClient

    from app.core.security import get_current_user

    app.dependency_overrides.pop(get_current_user, None)
    anon = TestClient(app, raise_server_exceptions=False)
    assert anon.get(f"{BASE}/public/asha-dev").status_code == 200
    assert anon.get(f"{BASE}/me").status_code == 401


# ---- resume parsing -----------------------------------------------------------------------------------

def test_pdf_extraction_finds_hidden_hyperlinks():
    text, links = parser.extract_pdf(make_pdf("Asha Verma\nSee my work " + "x" * 90, link="https://github.com/ashav/tracker"))
    assert "Asha Verma" in text
    assert "https://github.com/ashav/tracker" in links


def test_heuristic_parser_extracts_the_main_sections():
    text, links = parser.extract_pdf(make_pdf())
    out = parser.sanitize(parser.heuristic_parse(text, links))
    assert out["basics"]["fullName"] == "Asha Verma" and out["basics"]["email"] == "asha.verma@example.com"
    assert out["handles"]["github"] == "ashav" and out["handles"]["leetcode"] == "ashav"
    assert "Python" in out["skills"]["languages"] and "FastAPI" in out["skills"]["frameworks"]
    assert out["projects"][0]["title"] == "Placement Tracker" and "React" in out["projects"][0]["techStack"]
    assert out["projects"][0]["liveUrl"] == "https://tracker.example.com"
    assert out["experience"][0]["company"] == "Acme Corp" and len(out["experience"][0]["descriptionBullets"]) == 2
    assert "Graphic Era" in out["education"][0]["institution"]
    assert out["achievements"]


def test_sanitize_drops_unsafe_links_from_model_output():
    out = parser.sanitize({
        "basics": {"fullName": "X", "socials": {"github": "javascript:alert(1)", "linkedin": "https://linkedin.com/in/x"}},
        "projects": [{"id": "p", "title": "T", "liveUrl": "javascript:alert(1)", "githubUrl": "https://github.com/x/y"}],
    })
    assert "github" not in out["basics"]["socials"] and out["basics"]["socials"]["linkedin"]
    assert out["projects"][0].get("liveUrl") is None and out["projects"][0]["githubUrl"] == "https://github.com/x/y"


def _fake_world(monkeypatch):
    def handler(req: httpx.Request) -> httpx.Response:
        host, path = req.url.host, req.url.path
        if host == "leetcode.com":
            return httpx.Response(200, json={"data": {
                "matchedUser": {"submitStats": {"acSubmissionNum": [
                    {"difficulty": "All", "count": 460}, {"difficulty": "Easy", "count": 165},
                    {"difficulty": "Medium", "count": 235}, {"difficulty": "Hard", "count": 60}]}},
                "userContestRanking": {"rating": 1740.4, "globalRanking": 5000, "topPercentage": 9.8}}})
        if host == "api.github.com" and path.endswith("/repos"):
            return httpx.Response(200, json=[
                {"name": "tracker", "language": "Python", "stargazers_count": 5, "description": "Tracks jobs",
                 "html_url": "https://github.com/ashav/tracker", "homepage": "https://tracker.example.com"},
                {"name": "x", "language": "Python", "stargazers_count": 2}, {"name": "y", "language": "C++", "stargazers_count": 0}])
        if host == "api.github.com":
            return httpx.Response(200, json={"html_url": "https://github.com/ashav", "public_repos": 3, "followers": 9})
        if host == "codeforces.com":
            return httpx.Response(200, json={"status": "OK", "result": [{"rating": 1380, "maxRating": 1410, "rank": "specialist"}]})
        if host == "www.codechef.com":
            return httpx.Response(200, text='<div class="rating-number">1623</div><div class="rating-star"><span>★</span><span>★</span><span>★</span></div><small>(Highest Rating 1650)</small>')
        return httpx.Response(404)

    monkeypatch.setattr(enrichment, "make_client", lambda: httpx.AsyncClient(transport=httpx.MockTransport(handler)))


def test_sync_stats_pulls_live_numbers_and_enriches_projects(client, monkeypatch):
    _fake_world(monkeypatch)
    data = claim(client)
    data["projects"] = [{"id": "p1", "title": "Tracker", "githubUrl": "https://github.com/ashav/tracker"},
                        {"id": "p2", "title": "Mine", "imageUrl": "https://img.example.com/mine.png", "liveUrl": "https://mine.example.com"}]
    client.http.put(f"{BASE}/me", json=data)
    r = client.http.post(f"{BASE}/sync-stats", json={"github": "ashav", "leetcode": "ashav", "codechef": "ashav", "codeforces": "ashav"})
    assert r.status_code == 200, r.text
    body = r.json()
    stats = body["data"]["codingStats"]
    assert (stats["leetcode"]["totalSolved"], stats["leetcode"]["hardSolved"]) == (460, 60)
    assert stats["github"]["totalStars"] == 7 and stats["github"]["topLanguages"][0] == "Python"
    assert stats["codeforces"]["rank"] == "Specialist" and stats["codechef"]["stars"] == "3★" and stats["codechef"]["maxRating"] == 1650
    p1, p2 = body["data"]["projects"]
    assert p1["description"] == "Tracks jobs" and p1["liveUrl"] == "https://tracker.example.com"
    assert p1["imageUrl"].startswith("https://api.microlink.io/?url=https%3A%2F%2Ftracker.example.com")
    assert p2["imageUrl"] == "https://img.example.com/mine.png"  # a custom image is never overwritten
    assert body["warnings"] == []


def test_sync_stats_survives_a_dead_provider_and_bad_usernames(client, monkeypatch):
    monkeypatch.setattr(enrichment, "make_client", lambda: httpx.AsyncClient(transport=httpx.MockTransport(lambda r: httpx.Response(503))))
    claim(client)
    r = client.http.post(f"{BASE}/sync-stats", json={"leetcode": "ashav", "github": "../etc/passwd"})
    assert r.status_code == 200
    warnings = " ".join(r.json()["warnings"])
    assert "leetcode" in warnings and "github" in warnings and r.json()["data"]["codingStats"] == {}


def test_upload_resume_fills_sections_and_keeps_visual_choices(client, monkeypatch):
    _fake_world(monkeypatch)
    data = claim(client)
    data["config"]["templateId"] = "shiplog"
    data["basics"]["resumeUrl"] = "https://drive.example.com/resume.pdf"
    client.http.put(f"{BASE}/me", json=data)
    r = client.http.post(f"{BASE}/upload-resume", files={"file": ("resume.pdf", make_pdf(), "application/pdf")})
    assert r.status_code == 200, r.text
    got = r.json()["data"]
    assert got["config"]["templateId"] == "shiplog"
    assert got["basics"]["fullName"] == "Asha Verma" and got["basics"]["resumeUrl"] == "https://drive.example.com/resume.pdf"
    assert got["projects"][0]["title"] == "Placement Tracker" and got["codingStats"]["leetcode"]["totalSolved"] == 460
    assert got["basics"]["socials"]["github"] == "https://github.com/ashav"


def test_upload_resume_rejects_non_pdf_and_scans(client):
    claim(client)
    bad = client.http.post(f"{BASE}/upload-resume", files={"file": ("resume.pdf", b"not a pdf", "application/pdf")})
    assert bad.status_code == 415
    blank = client.http.post(f"{BASE}/upload-resume", files={"file": ("resume.pdf", make_pdf("hi"), "application/pdf")})
    assert blank.status_code == 422 and blank.json()["error"]["code"] == "RESUME_UNREADABLE"


def test_deleting_the_account_removes_the_portfolio(client, session_factory):
    claim(client)
    r = client.http.request("DELETE", "/api/v1/me", json={"confirm": "DELETE MY ACCOUNT"})
    assert r.status_code == 204
    from sqlalchemy import select

    from app.db.models.site import UserPortfolio

    with session_factory() as db:
        assert db.scalar(select(UserPortfolio)) is None
