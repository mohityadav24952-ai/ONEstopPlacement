"""Portfolio Site Builder: handles, saving, resume parsing, live enrichment (mocked), public pages."""
import io
import json

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


MESSY_PROJECTS = """Asha Verma
asha.verma@example.com

ACADEMIC PROJECTS
Ride Fare Estimator | Python, Flask, Google Maps API
- Built a web app that
computed fares from Google Maps distance data for 4 cab providers.
- Cached quotes in Redis to cut latency by 40%.
Placement Tracker
React, FastAPI, PostgreSQL
- Tracks applications and interview rounds
for 300+ students.
iOS Habit Coach (Swift, SwiftUI)
- Reminders and streaks.

Positions of Responsibility
Technical Head, ACM Student Chapter
- Led a 20 member team for the CSE
Branch, demonstrating leadership and event planning.
Extracurricular Activities
- Volunteered at college fest
"""


def test_heuristic_parser_keeps_only_real_projects_and_never_splits_bullets():
    out = parser.sanitize(parser.heuristic_parse(MESSY_PROJECTS, []))
    projects = out["projects"]
    assert [p["title"] for p in projects] == ["Ride Fare Estimator", "Placement Tracker", "iOS Habit Coach"]
    ride, tracker, habit = projects
    assert ride["techStack"] == ["Python", "Flask", "Google Maps API"]
    assert "computed fares from Google Maps" in ride["description"] and "Redis" in ride["description"]
    assert tracker["techStack"] == ["React", "FastAPI", "PostgreSQL"] and "300+ students" in tracker["description"]
    assert habit["techStack"] == ["Swift", "SwiftUI"]
    assert not any("leadership" in p["description"].lower() or "fest" in p["description"].lower() for p in projects)


REAL_LAYOUT = """Student Name
Skills
• Programming Languages: C/C++, Python, Java
• Web Technologies: HTML5, CSS3, React.js, Next.js
Projects
CodeForge AI — Browser-Based Web IDE with AI Code Assistant
• Engineered in-browser Node.js execution with WebContainers, an xterm.js terminal and live preview.
• Implemented NextAuth Google/GitHub authentication, Prisma/SQLite persistence and a Zustand file tree.
Technologies: Next.js, React, TypeScript, Monaco Editor, Tailwind CSS.
VeloxRide — Real-Time Ride-Hailing Platform
• Used MongoDB geospatial queries to find captains within 2 km and dispatch requests to connected captains;
computed fares from Google Distance Matrix data.
• Secured with JWT + bcrypt and crypto-generated OTP verification.
Technologies: React, Node.js, Express.js, MongoDB, Google Maps APIs, Tailwind CSS.
InterviewFlow — Technical Interview Platform
• Integrated Monaco Editor with Piston API to run JavaScript, Python and Java on DSA problems.
Technologies: React, Node.js, Express.js, MongoDB, TanStack Query, Tailwind CSS.
Coding Profiles
• Earned a Knight badge on LeetCode with a peak rating of 1864 (Top 4% globally).
• Achieved a 4-star rating on CodeChef, with a maximum rating of 1805.
Leadership / Achievements
• Secured All India Rank 269 in the NDA examination, ranking among the Top 0.07% of approximately 4 lakh
candidates.
• Cleared the 5-day SSB interview and earned a recommendation for the Indian Air Force Flying
Branch, demonstrating leadership, teamwork, adaptability, and composure under pressure.
Certifications
• Oracle University: Agentic AI Foundations (Course Completed).
"""


def test_real_resume_layout_gives_exactly_the_three_projects_intact():
    text, links = parser.extract_pdf(make_pdf(REAL_LAYOUT))
    out = parser.sanitize(parser.heuristic_parse(text, links))
    projects = out["projects"]
    assert [p["title"] for p in projects] == ["CodeForge AI", "VeloxRide", "InterviewFlow"]  # no "Coding Profiles"
    velox = projects[1]
    assert velox["tagline"] == "Real-Time Ride-Hailing Platform"  # the subtitle is not a technology
    assert velox["techStack"] == ["React", "Node.js", "Express.js", "MongoDB", "Google Maps APIs", "Tailwind CSS"]
    assert "connected captains; computed fares from Google Distance Matrix data." in velox["description"]  # one piece
    assert projects[0]["techStack"][-1] == "Tailwind CSS"  # no trailing full stop
    assert not any("LeetCode" in p["description"] or "NDA" in p["description"] for p in projects)
    titles = [a["title"] for a in out["achievements"]]
    assert len(titles) == 3 and not any(t.startswith(("Branch", "candidates")) for t in titles)  # wrapped lines joined
    assert "Flying Branch, demonstrating leadership" in titles[1]


def test_model_answer_in_the_alternate_shape_is_normalised_and_headings_dropped():
    class Fake:
        provider = model = "fake"

        def generate_json(self, req):
            from app.ai.llm import LLMResponse
            return LLMResponse(text=json.dumps({"basics": {"fullName": "A"}, "projects": [
                {"title": "VeloxRide", "tech_stack": "React, Node.js, MongoDB.", "bullets": ["Socket.io dispatch.", "Fares from Google."]},
                {"title": "Coding Profiles", "description": "Knight badge on LeetCode"},
                {"title": "Leadership / Achievements", "description": "NDA AIR 269"},
            ]}))

    out = parser.sanitize(parser.llm_parse(Fake(), "Projects\nVeloxRide\nCoding Profiles\n" + "x" * 100, []))
    assert [p["title"] for p in out["projects"]] == ["VeloxRide"]
    assert out["projects"][0]["techStack"] == ["React", "Node.js", "MongoDB"]
    assert out["projects"][0]["description"] == "Socket.io dispatch. Fares from Google."


def test_model_projects_that_are_sentence_fragments_are_dropped():
    class Fake:
        provider = model = "fake"

        def generate_json(self, req):
            from app.ai.llm import LLMResponse
            return LLMResponse(text=json.dumps({"basics": {"fullName": "A"}, "projects": [
                {"title": "Placement Tracker", "techStack": ["React"]},
                {"title": "computed fares from Google Maps"},
                {"title": "Branch, demonstrating leadership and event planning."},
            ]}))

    out = parser.llm_parse(Fake(), "Projects\nPlacement Tracker\n" + "x" * 100, [])
    assert [p["title"] for p in out["projects"]] == ["Placement Tracker"]


def _fake_llm(projects):
    from app.ai.llm import LLMResponse

    class Fake:
        provider = model = "fake"

        def generate_json(self, req):
            self.system = req.system
            return LLMResponse(text=json.dumps({"basics": {"fullName": "A"}, "projects": projects}))

    return Fake()


def test_strict_project_schema_is_requested_and_mapped_onto_the_portfolio_shape():
    llm = _fake_llm([{
        "title": "VeloxRide", "tagline": "Real-Time Ride-Hailing Platform", "tech_stack": "React, Node.js, MongoDB.",
        "description_bullets": ["Socket.io ride dispatch.", "Computed fares from Google Distance Matrix data."],
    }])
    text = "Projects\nVeloxRide — Real-Time Ride-Hailing Platform\n" + "x" * 100
    out = parser.sanitize(parser.llm_parse(llm, text, ["https://github.com/someone/veloxride"]))
    assert '"description_bullets": string[]' in llm.system and "STOP extracting" in llm.system
    p = out["projects"][0]
    assert p["techStack"] == ["React", "Node.js", "MongoDB"] and p["tagline"] == "Real-Time Ride-Hailing Platform"
    assert p["description"] == "Socket.io ride dispatch. Computed fares from Google Distance Matrix data."
    assert p["githubUrl"] == "https://github.com/someone/veloxride"  # matched from the PDF's links by title


def test_model_cannot_invent_a_project_that_is_not_in_the_resume():
    llm = _fake_llm([{"title": "VeloxRide", "tech_stack": "React", "description_bullets": ["x"]},
                     {"title": "Totally Made Up App", "tech_stack": "Rust", "description_bullets": ["y"]}])
    out = parser.llm_parse(llm, "Projects\nVelox Ride\n" + "x" * 100, [])  # PDF split the word: still found
    assert [p["title"] for p in out["projects"]] == ["VeloxRide"]


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


# ---- resume LLM: Gemini key rotation, then Groq ------------------------------------------------------

def _chain(script, groq_key="g"):
    """script maps a client label ("gemini:k1", "groq:g") to an LLMError category, or "OK"."""
    from app.ai.llm import LLMError, LLMResponse, ResumeParseChain

    calls = []

    def factory(kind):
        class Stub:
            def __init__(self, key, model, timeout):
                self.label = f"{kind}:{key}"

            def generate_json(self, req):
                calls.append(self.label)
                outcome = script[self.label]
                if outcome != "OK":
                    raise LLMError(outcome)
                return LLMResponse(text='{"basics": {}}', model=self.label)
        return Stub

    chain = ResumeParseChain(["k1", "k2"], "gemini-x", groq_key, "llama-x", 5,
                             gemini_factory=factory("gemini"), groq_factory=factory("groq"))
    return chain, calls


def _req():
    from app.ai.llm import LLMRequest
    return LLMRequest(workflow="site_parse", system="s", user="u", payload={})


def test_key_1_answers_when_it_has_quota():
    chain, calls = _chain({"gemini:k1": "OK"})
    chain.generate_json(_req())
    assert calls == ["gemini:k1"] and chain.provider == "gemini"


def test_a_429_on_key_1_rotates_to_key_2():
    chain, calls = _chain({"gemini:k1": "RATE_LIMIT", "gemini:k2": "OK"})
    chain.generate_json(_req())
    assert calls == ["gemini:k1", "gemini:k2"] and chain.attempts == ["gemini#1:RATE_LIMIT", "gemini#2:OK"]


def test_both_gemini_keys_out_of_quota_falls_back_to_groq():
    chain, calls = _chain({"gemini:k1": "RATE_LIMIT", "gemini:k2": "RATE_LIMIT", "groq:g": "OK"})
    chain.generate_json(_req())
    assert calls == ["gemini:k1", "gemini:k2", "groq:g"] and (chain.provider, chain.model) == ("groq", "llama-x")


def test_a_non_quota_gemini_failure_goes_straight_to_groq():
    chain, calls = _chain({"gemini:k1": "TIMEOUT", "groq:g": "OK"})
    chain.generate_json(_req())
    assert calls == ["gemini:k1", "groq:g"]  # key 2 would time out the same way


def test_everything_failing_returns_none_so_the_rule_based_parser_runs():
    chain, _ = _chain({"gemini:k1": "RATE_LIMIT", "gemini:k2": "RATE_LIMIT", "groq:g": "PROVIDER_ERROR"})
    assert parser.llm_parse(chain, "x" * 100, []) is None


def test_resume_llm_uses_the_numbered_keys_and_placey_rotates_them_too(monkeypatch):
    from app.ai import llm as llm_mod
    from app.core.config import Settings

    s = Settings(gemini_api_key_1="a", gemini_api_key_2="b", groq_api_key="g", llm_provider="mock", _env_file=None)
    monkeypatch.setattr(llm_mod, "get_settings", lambda: s)
    chain = llm_mod.get_resume_llm()
    assert isinstance(chain, llm_mod.ResumeParseChain) and chain.gemini_keys == ["a", "b"] and chain.groq_key == "g"
    assert llm_mod.get_placey_llm().keys == ["a", "b"]  # Ask Placey keeps working without a plain GEMINI_API_KEY


def test_an_overloaded_gemini_key_rotates_too():
    from app.ai.llm import LLMError, LLMResponse, ResumeParseChain

    calls = []

    class Stub:
        def __init__(self, key, model, timeout):
            self.key = key

        def generate_json(self, req):
            calls.append(self.key)
            if self.key == "k1":
                raise LLMError("PROVIDER_ERROR", "status 503")
            return LLMResponse(text="{}", model="m")

    ResumeParseChain(["k1", "k2"], "m", "", "", 5, gemini_factory=Stub).generate_json(_req())
    assert calls == ["k1", "k2"]
