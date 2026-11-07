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


def _fake_llm(answer: dict):
    """A provider that returns `answer` (a strict LLMResume dict) and remembers the request it got."""
    from app.ai.llm import LLMResponse

    class Fake:
        provider = model = "fake"

        def generate_json(self, req):
            self.request = req
            return LLMResponse(text=json.dumps(answer))

    return Fake()


STRICT_RESUME = """Rohan Mehta
rohan@example.com
Projects
VeloxRide — Real-Time Ride-Hailing Platform
• Built Socket.io ride dispatch with host-only session termination.
• Computed fares from Google Distance Matrix data.
Technologies: React, Node.js, MongoDB
Coding Profiles
LeetCode Knight (1900) leetcode.com/u/rohanm
Leadership / Achievements
• AIR 269 in UPSC NDA-153, recommended by 19 SSB.
Certifications
AWS Certified Cloud Practitioner
"""


def _strict_answer(**over):
    answer = {
        "basics": {"full_name": "Rohan Mehta", "headline": "", "email": "rohan@example.com", "phone": "", "location": ""},
        "education": [], "experience": [],
        "skills": {"languages": [], "frameworks": ["React"], "databases_and_cloud": ["MongoDB"], "ai_and_ml": [], "core_cs_and_tools": []},
        "projects": [{
            "title": "VeloxRide", "tagline": "Real-Time Ride-Hailing Platform", "tech_stack": ["React", "Node.js", "MongoDB"],
            "bullets": ["Built Socket.io ride dispatch with host-only session termination.",
                        "Computed fares from Google Distance Matrix data."],
            "github_url": "", "live_url": "",
        }],
        "coding_profiles": ["LeetCode Knight (1900) leetcode.com/u/rohanm"],
        "achievements_and_leadership": ["AIR 269 in UPSC NDA-153, recommended by 19 SSB."],
        "certifications": ["AWS Certified Cloud Practitioner"],
    }
    answer.update(over)
    return answer


def test_strict_schema_is_sent_and_mapped_onto_the_legacy_portfolio_shape():
    from app.modules.site_builder import llm_mapper

    llm = _fake_llm(_strict_answer())
    out = parser.sanitize(llm_mapper.llm_parse(llm, STRICT_RESUME, ["https://github.com/someone/veloxride"]))
    req = llm.request
    assert req.response_schema["properties"]["coding_profiles"]["type"] == "array"
    assert "DO NOT summarize, alter, or rephrase" in req.system and "A Project must be an actual software" in req.system
    p, = out["projects"]
    assert p["title"] == "VeloxRide" and p["tagline"] == "Real-Time Ride-Hailing Platform"
    assert p["techStack"] == ["React", "Node.js", "MongoDB"] and p["featured"] is True
    assert p["description"] == ("Built Socket.io ride dispatch with host-only session termination. "
                                "Computed fares from Google Distance Matrix data.")
    assert p["githubUrl"] == "https://github.com/someone/veloxride"  # matched from the PDF's links by title
    # The portfolio has one achievements list: leadership, certifications and coding profiles are mixed in Python.
    assert [(a["title"], a["issuer"]) for a in out["achievements"]] == [
        ("AIR 269 in UPSC NDA-153, recommended by 19 SSB.", ""),
        ("AWS Certified Cloud Practitioner", ""),
        ("LeetCode Knight (1900) leetcode.com/u/rohanm", "LeetCode"),
    ]
    assert out["basics"]["socials"]["leetcode"] == "https://leetcode.com/u/rohanm/"  # from the profile line
    assert out["handles"]["leetcode"] == "rohanm" and out["skills"]["frameworks"] == ["React"]


def test_headings_profiles_and_bullet_fragments_never_become_projects():
    from app.modules.site_builder import llm_mapper

    junk = [{"title": t, "tagline": "", "tech_stack": [], "bullets": [], "github_url": "", "live_url": ""}
            for t in ("Coding Profiles", "Leadership / Achievements", "host-only session termination",
                      "LeetCode Knight", "Certifications")]
    answer = _strict_answer()
    answer["projects"] += junk
    out = llm_mapper.llm_parse(_fake_llm(answer), STRICT_RESUME, [])
    assert [p["title"] for p in out["projects"]] == ["VeloxRide"]


def test_reworded_bullets_are_replaced_by_the_resume_text():
    from app.modules.site_builder import llm_mapper

    answer = _strict_answer()
    answer["projects"][0]["bullets"] = ["Engineered a real-time dispatch system using Socket.io.",  # rephrased
                                        "Computed fares from Google Distance Matrix data."]
    out = llm_mapper.llm_parse(_fake_llm(answer), STRICT_RESUME, [])
    desc = out["projects"][0]["description"]
    assert "Engineered" not in desc
    assert "host-only session termination" in desc and "Computed fares from Google Distance Matrix data" in desc


def test_invented_values_are_dropped():
    from app.modules.site_builder import llm_mapper

    answer = _strict_answer(achievements_and_leadership=["Won the Smart India Hackathon 2025"])
    answer["projects"].append({"title": "Totally Made Up App", "tagline": "", "tech_stack": ["Rust"],
                               "bullets": ["y"], "github_url": "", "live_url": ""})
    answer["projects"][0]["tech_stack"] = ["React", "Kubernetes"]
    out = llm_mapper.llm_parse(_fake_llm(answer), STRICT_RESUME.replace("VeloxRide", "Velox Ride"), [])
    assert [p["title"] for p in out["projects"]] == ["VeloxRide"]  # PDF split the word: still found
    assert out["projects"][0]["techStack"] == ["React"]
    assert [a["title"] for a in out["achievements"]] == ["AWS Certified Cloud Practitioner",
                                                         "LeetCode Knight (1900) leetcode.com/u/rohanm"]


def test_an_answer_outside_the_strict_schema_falls_back_to_the_rule_based_parser():
    from app.modules.site_builder import llm_mapper

    legacy = {"basics": {"fullName": "A"}, "projects": [{"title": "VeloxRide", "description": "x"}]}
    assert llm_mapper.llm_parse(_fake_llm(legacy), STRICT_RESUME, []) is None
    rules = parser.heuristic_parse(STRICT_RESUME, [])
    assert [p["title"] for p in rules["projects"]] == ["VeloxRide"]


def test_response_schema_is_strict_everywhere():
    from app.modules.site_builder.llm_schema import response_schema

    def objects(node):
        if isinstance(node, dict):
            if node.get("type") == "object":
                yield node
            for v in node.values():
                yield from objects(v)
        elif isinstance(node, list):
            for v in node:
                yield from objects(v)

    from app.modules.site_builder.llm_schema import LLMProject

    schema = response_schema()
    assert "$ref" not in json.dumps(schema) and "$defs" not in schema
    # Every field survives (a field called "title" must not be stripped along with JSON-schema titles).
    assert list(schema["properties"]["projects"]["items"]["properties"]) == list(LLMProject.model_fields)
    found = list(objects(schema))
    assert len(found) >= 6
    for obj in found:
        assert obj["additionalProperties"] is False and set(obj["required"]) == set(obj["properties"])


def test_providers_send_the_schema_and_retry_without_it_if_rejected(monkeypatch):
    from app.ai import llm

    bodies = []

    def fake_post(url, headers, body, timeout):
        bodies.append(body)
        if len(bodies) == 1:
            raise llm.LLMError("PROVIDER_ERROR", "status 400")
        if "groq" in url:
            return {"choices": [{"message": {"content": "{}"}}]}
        return {"candidates": [{"content": {"parts": [{"text": "{}"}]}}]}

    monkeypatch.setattr(llm, "_post", fake_post)
    req = llm.LLMRequest(workflow="site_parse", system="s", user="u", response_schema={"type": "object"})
    llm.GeminiClient("k", "m", 5).generate_json(req)
    assert bodies[0]["generationConfig"]["responseJsonSchema"] == {"type": "object"}
    assert "responseJsonSchema" not in bodies[1]["generationConfig"]
    bodies.clear()
    llm.GroqClient("k", "m", 5).generate_json(req)
    assert bodies[0]["response_format"]["type"] == "json_schema" and bodies[0]["response_format"]["json_schema"]["strict"]
    assert bodies[1]["response_format"] == {"type": "json_object"}


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
    from app.modules.site_builder import llm_mapper
    assert llm_mapper.llm_parse(chain, "x" * 100, []) is None


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


def _model_chain(outcomes):
    """outcomes maps (key, model) to an LLMError (category, message) or "OK"."""
    from app.ai.llm import LLMError, LLMResponse, ResumeParseChain

    calls = []

    class Stub:
        def __init__(self, key, model, timeout):
            self.key, self.model = key, model

        def generate_json(self, req):
            calls.append((self.key, self.model))
            outcome = outcomes.get((self.key, self.model), "OK")
            if outcome != "OK":
                raise LLMError(*outcome)
            return LLMResponse(text="{}", model=self.model)

    chain = ResumeParseChain(["k1", "k2"], "main", "g", "llama", 5, gemini_factory=Stub,
                             groq_factory=Stub, gemini_fallback_models=["lite", "main"])
    return chain, calls


def test_an_overloaded_model_falls_back_to_a_lighter_model_on_the_same_key():
    chain, calls = _model_chain({("k1", "main"): ("PROVIDER_ERROR", "status 503")})
    chain.generate_json(_req())
    assert calls == [("k1", "main"), ("k1", "lite")]  # duplicate "main" in the fallbacks is ignored
    assert (chain.provider, chain.model) == ("gemini", "lite") and chain.attempts[-1] == "gemini#1/lite:OK"


def test_every_model_on_key_1_busy_moves_to_key_2_then_groq():
    busy = ("PROVIDER_ERROR", "status 503")
    chain, calls = _model_chain({("k1", "main"): busy, ("k1", "lite"): ("RATE_LIMIT",),
                                 ("k2", "main"): busy, ("k2", "lite"): busy})
    chain.generate_json(_req())
    assert calls == [("k1", "main"), ("k1", "lite"), ("k2", "main"), ("k2", "lite"), ("g", "llama")]
    assert chain.provider == "groq"


def test_a_timeout_skips_the_remaining_gemini_models_and_keys():
    chain, calls = _model_chain({("k1", "main"): ("TIMEOUT",)})
    chain.generate_json(_req())
    assert calls == [("k1", "main"), ("g", "llama")]


def test_resume_llm_reads_the_fallback_models_from_settings(monkeypatch):
    from app.ai import llm as llm_mod
    from app.core.config import Settings

    s = Settings(gemini_api_key_1="a", resume_parse_model="m1", resume_parse_fallback_models=" m2, ,m3",
                 llm_provider="mock", _env_file=None)
    monkeypatch.setattr(llm_mod, "get_settings", lambda: s)
    assert llm_mod.get_resume_llm().gemini_models == ["m1", "m2", "m3"]


def test_sections_the_model_dropped_are_filled_from_the_rule_based_parse():
    rules = parser.heuristic_parse(RESUME + "- Second prize, Codeathon\n- Top 1% in NPTEL Cloud\n", [])
    model = {"basics": {"fullName": ""}, "skills": {}, "projects": rules["projects"],
             "achievements": [{"id": "a-1", "title": "Winner, Smart India Hackathon internal round"}],
             "education": [], "experience": rules["experience"]}
    out = parser.sanitize(parser.fill_gaps(model, rules))
    assert len(out["achievements"]) == 3  # model kept 1 of 3: the rule-based list wins
    assert out["education"] and out["education"][0]["institution"] == "Graphic Era University"
    assert out["skills"]["languages"] == ["Python", "C++", "SQL"]
    assert out["basics"]["fullName"] == "Asha Verma"


def test_fill_gaps_keeps_a_model_answer_that_is_complete():
    rules = parser.heuristic_parse(RESUME, [])
    model = {"basics": {"fullName": "Asha V."}, "skills": {"languages": ["Python"]},
             "projects": [{"id": "p-1", "title": "Placement Tracker", "description": "Model text"}],
             "achievements": [{"id": "a-1", "title": "SIH winner"}], "education": rules["education"], "experience": []}
    out = parser.fill_gaps(model, rules)
    assert out["projects"][0]["description"] == "Model text" and out["achievements"][0]["title"] == "SIH winner"
    assert out["skills"] == {"languages": ["Python"]} and out["basics"]["fullName"] == "Asha V."
    assert out["experience"] == rules["experience"]  # 0 vs 1 found: the model clearly dropped it


def test_an_unknown_model_name_tries_the_next_model_instead_of_giving_up():
    chain, calls = _model_chain({("k1", "main"): ("PROVIDER_ERROR", "status 404")})
    chain.generate_json(_req())
    assert calls == [("k1", "main"), ("k1", "lite")] and chain.model == "lite"


def test_achievements_the_model_left_out_are_added_without_duplicating_its_rewrites():
    rules = {"basics": {}, "skills": {}, "projects": [], "experience": [], "education": [], "achievements": [
        {"id": "a1", "title": "Secured All India Rank 269 in the Union Public Service Commission (UPSC) NDA-153 exam"},
        {"id": "a2", "title": "Cleared the 5-day SSB interview and earned an AFSB Varanasi recommendation"},
        {"id": "a3", "title": "Amazon Web Services (AWS) Trained: Well-Architected (Proficient), Networking Core"},
        {"id": "a4", "title": "Oracle University: Agentic AI Foundations Associate (1Z0-1157-26)."},
    ]}
    model = {"basics": {"fullName": "M"}, "skills": {"languages": ["C"]}, "projects": [], "experience": [],
             "education": [], "achievements": [
                 {"id": "m1", "title": "All India Rank 269 in UPSC NDA-153 examination"},
                 {"id": "m2", "title": "Cleared 5-day SSB interview and earned AFSB Varanasi recommendation"}]}
    got = [a["id"] for a in parser.fill_gaps(model, rules)["achievements"]]
    assert got == ["m1", "m2", "a3", "a4"]  # the two certifications come back; the rewrites are not doubled


# ---- slow AI step and shared GitHub cache ------------------------------------------------------------

def test_slow_ai_parse_falls_back_to_rules_within_budget(monkeypatch):
    import threading
    from app.modules.site_builder import llm_mapper

    release = threading.Event()

    def slow_llm_parse(*args, **kwargs):
        release.wait(5)  # far beyond the budget below
        return None

    class Slow:
        provider = model = "slow"

    monkeypatch.setattr(parser, "LLM_BUDGET_SECONDS", 0.2)
    monkeypatch.setattr(llm_mapper, "llm_parse", slow_llm_parse)
    try:
        out = parser.parse_resume(make_pdf(), Slow())
    finally:
        release.set()
    assert out["notes"] and "rule-based" in out["notes"][0]
    assert out["basics"]["fullName"] == "Asha Verma"  # the rule-based result, not a failure


def test_github_enrichment_reuses_cached_data_without_calling_github(monkeypatch):
    import asyncio
    from app.integrations import github_cache

    github_cache.put("raw", "ashav", {"user": {"html_url": "https://github.com/ashav", "public_repos": 1, "followers": 2},
                                      "repos": [{"name": "tracker", "language": "Go", "stargazers_count": 4}]})

    def no_network(req):
        raise AssertionError("cached data must not trigger a GitHub request")

    async def run():
        async with httpx.AsyncClient(transport=httpx.MockTransport(no_network)) as c:
            return await enrichment.fetch_github_stats(c, "AshaV")  # case-insensitive key

    stats, repos = asyncio.run(run())
    assert stats["totalStars"] == 4 and stats["topLanguages"] == ["Go"] and "tracker" in repos


def test_github_enrichment_uses_stale_cache_when_rate_limited(monkeypatch):
    import asyncio
    import time
    from app.integrations import github_cache

    github_cache.put("raw", "ashav", {"user": {"public_repos": 1}, "repos": [{"name": "old", "stargazers_count": 1}]})
    real = time.monotonic
    monkeypatch.setattr(time, "monotonic", lambda: real() + github_cache.TTL_SECONDS + 60)  # now stale

    async def run():
        limited = httpx.MockTransport(lambda r: httpx.Response(403, headers={"x-ratelimit-remaining": "0"}))
        async with httpx.AsyncClient(transport=limited) as c:
            return await enrichment.fetch_github_stats(c, "ashav")

    stats, repos = asyncio.run(run())
    assert "old" in repos and stats["totalStars"] == 1
