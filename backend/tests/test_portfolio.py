import io
import json
import zipfile

import pytest

from app.ai.llm import LLMResponse, get_llm_client
from app.modules.portfolio import content as cmod
from app.modules.portfolio import generator


def seed(client):
    h = client.http
    v = h.get("/api/v1/me").json()["profile"]["version"]
    h.patch("/api/v1/profile", json={"expected_version": v, "display_name": "Asha Verma", "headline": "Backend student",
                                     "summary": "Student who builds APIs with Python.", "location_pref": "Dehradun"})
    h.post("/api/v1/profile/skills", json={"name": "Python", "category": "Languages"})
    h.post("/api/v1/profile/education", json={"institution": "Graphic Era University", "degree": "B.Tech"})
    h.post("/api/v1/profile/projects", json={"title": "Tracker", "description": "Web app for tracking applications.",
                                             "tech": ["Python"], "links": ["https://github.com/asha/tracker"]})


def create(client, **kw):
    r = client.http.post("/api/v1/portfolio", json={"title": "My site", **kw})
    assert r.status_code == 201, r.text
    return r.json()


def approve(client, vid):
    s = client.http.get(f"/api/v1/portfolio/versions/{vid}/consent-summary").json()
    return client.http.post(f"/api/v1/portfolio/versions/{vid}/approve", json={"consent_summary_hash": s["summary_hash"]})


def test_themes_listed(client):
    themes = client.http.get("/api/v1/portfolio/themes").json()
    assert {t["id"] for t in themes} == {"minimal", "midnight", "classic"}


def test_full_journey_j4(client, tmp_path):
    seed(client)
    out = create(client)
    v = out["version"]
    vid = v["id"]
    assert v["content"]["hero"]["name"] == "Asha Verma" and v["status"] == "DRAFT"
    # sensitive fields are off by default
    assert v["content"]["contact"]["include_email"] is False and v["content"]["contact"]["include_location"] is False

    prev = client.http.get(f"/api/v1/portfolio/versions/{vid}/preview")
    assert prev.status_code == 200 and "Preview only" in prev.text and "sandbox" in prev.headers["content-security-policy"]
    assert "asha@example.com" not in prev.text and "Dehradun" not in prev.text

    assert client.http.patch(f"/api/v1/portfolio/versions/{vid}", json={"theme_id": "midnight", "accent": "green"}).status_code == 200
    rep = client.http.post(f"/api/v1/portfolio/versions/{vid}/validate").json()
    assert rep["ok"] is True

    # export before approval is refused
    assert client.http.post(f"/api/v1/portfolio/versions/{vid}/export").status_code == 409
    # stale / wrong consent hash is refused
    bad = client.http.post(f"/api/v1/portfolio/versions/{vid}/approve", json={"consent_summary_hash": "x"})
    assert bad.status_code == 409 and bad.json()["error"]["code"] == "CONSENT_MISMATCH"

    ok = approve(client, vid)
    assert ok.status_code == 200 and ok.json()["status"] == "APPROVED"
    assert client.http.patch(f"/api/v1/portfolio/versions/{vid}", json={"about_text": "x"}).status_code == 409

    exp = client.http.post(f"/api/v1/portfolio/versions/{vid}/export")
    assert exp.status_code == 200 and exp.json()["has_export"]
    data = client.http.get(f"/api/v1/portfolio/versions/{vid}/export")
    z = zipfile.ZipFile(io.BytesIO(data.content))
    assert set(z.namelist()) == {"index.html", "style.css", "README.md"}
    html = z.read("index.html").decode()
    assert "Asha Verma" in html and "<script" not in html.lower() and "Dehradun" not in html
    assert "--accent:#15803d" in z.read("style.css").decode()


def test_sensitive_data_requires_opt_in_and_is_listed_in_consent(client):
    seed(client)
    vid = create(client)["version"]["id"]
    client.http.patch(f"/api/v1/portfolio/versions/{vid}", json={"include_email": True, "include_location": True})
    summary = client.http.get(f"/api/v1/portfolio/versions/{vid}/consent-summary").json()
    assert any("Email address" in i for i in summary["items"]) and any("Location" in i for i in summary["items"])
    rep = client.http.post(f"/api/v1/portfolio/versions/{vid}/validate").json()
    assert any("email" in w["message"].lower() for w in rep["warnings"])
    # consent hash changes when the public set changes
    client.http.patch(f"/api/v1/portfolio/versions/{vid}", json={"include_email": False})
    assert client.http.get(f"/api/v1/portfolio/versions/{vid}/consent-summary").json()["summary_hash"] != summary["summary_hash"]


def test_blocking_validation_prevents_approval(client):
    seed(client)
    vid = create(client)["version"]["id"]
    client.http.patch(f"/api/v1/portfolio/versions/{vid}", json={"about_text": "Call me on +91 98765 43210 or mail asha@example.com"})
    rep = client.http.post(f"/api/v1/portfolio/versions/{vid}/validate").json()
    assert rep["ok"] is False and len(rep["errors"]) >= 2
    r = approve(client, vid)
    assert r.status_code == 409 and r.json()["error"]["code"] == "VALIDATION_BLOCKED"


def test_html_and_scripts_cannot_reach_output(client):
    seed(client)
    vid = create(client)["version"]["id"]
    evil = '<script>alert(1)</script><img src=x onerror=alert(1)>Hello'
    r = client.http.patch(f"/api/v1/portfolio/versions/{vid}", json={"about_text": evil, "hero": {"name": "<b>Asha</b>"}})
    assert r.status_code == 200
    c = r.json()["content"]
    assert "<" not in c["about"]["text"] and c["hero"]["name"] == "Asha"
    html = client.http.get(f"/api/v1/portfolio/versions/{vid}/preview").text
    assert "<script>alert" not in html and "<img src=x" not in html


def test_unlisted_links_blocked(client):
    seed(client)
    vid = create(client)["version"]["id"]
    # links are not editable via the API, so exercise the validator directly
    c = cmod.PortfolioContent.model_validate({
        "hero": {"name": "A"}, "projects": [{"id": "p", "title": "T", "links": ["http://insecure.example", "https://evil.example/x"]}]})
    rep = cmod.validate(c, ["https://github.com/asha/tracker"])
    msgs = " ".join(e["message"] for e in rep["errors"])
    assert "https" in msgs and "not from your profile" in msgs


def test_renderer_escapes_and_drops_unsafe_links():
    c = cmod.PortfolioContent.model_validate({"hero": {"name": "A"}, "projects": [
        {"id": "p", "title": "T", "links": ["javascript:alert(1)", "https://ok.example"]}]})
    c.projects[0].title = '"><script>x</script>'  # bypass validators on purpose
    html = generator.render_html(c, "minimal", {}, preview=False)
    assert "<script>x" not in html and "&lt;script&gt;" in html
    assert "javascript:" not in html and "https://ok.example" in html


def test_ai_text_with_invented_facts_is_discarded(app, client):
    class Inventor:
        provider, model = "t", "t"

        def generate_json(self, req):
            pid = req.payload["projects"][0]["id"]
            return LLMResponse(text=json.dumps({
                "about": "Led a team of 50 engineers at Google using Kubernetes.",
                "project_blurbs": [{"project_id": pid, "blurb": "Visit https://spam.example for 10x results."}],
            }))

    app.dependency_overrides[get_llm_client] = lambda: Inventor()
    seed(client)
    out = create(client)
    c = out["version"]["content"]
    assert c["about"]["text"] == "Student who builds APIs with Python."  # fell back to the user's own text
    assert c["projects"][0]["blurb"] == "Web app for tracking applications."
    assert any("discarded" in n for n in out["notes"])


def test_ai_unavailable_falls_back(app, client):
    class Down:
        provider, model = "t", "t"

        def generate_json(self, req):
            from app.ai.llm import LLMError

            raise LLMError("PROVIDER_ERROR")

    app.dependency_overrides[get_llm_client] = lambda: Down()
    seed(client)
    out = create(client)
    assert out["version"]["content"]["about"]["text"] and any("unavailable" in n for n in out["notes"])


def test_validation_of_inputs(client):
    seed(client)
    assert client.http.post("/api/v1/portfolio", json={"title": "x", "theme_id": "nope"}).status_code == 422
    assert client.http.post("/api/v1/portfolio", json={"title": "x", "sections": ["evil"]}).status_code == 422
    vid = create(client)["version"]["id"]
    assert client.http.patch(f"/api/v1/portfolio/versions/{vid}", json={"accent": "pink"}).status_code == 422
    assert client.http.patch(f"/api/v1/portfolio/versions/{vid}", json={"project_blurbs": {"nope": "x"}}).status_code == 422


def test_slug_unique_and_listing(client):
    seed(client)
    create(client)
    create(client)
    slugs = {p["slug"] for p in client.http.get("/api/v1/portfolio").json()}
    assert slugs == {"my-site", "my-site-2"}


def test_isolation_and_delete(client, tmp_path):
    seed(client)
    out = create(client)
    vid, pid = out["version"]["id"], out["portfolio_id"]
    approve(client, vid)
    client.http.post(f"/api/v1/portfolio/versions/{vid}/export")
    client.as_user("user-b")
    base = f"/api/v1/portfolio/versions/{vid}"
    for method, path in [("get", base), ("patch", base), ("get", base + "/preview"), ("post", base + "/validate"),
                         ("get", base + "/consent-summary"), ("post", base + "/export"), ("get", base + "/export"),
                         ("delete", f"/api/v1/portfolio/{pid}")]:
        kwargs = {"json": {}} if method == "patch" else {}
        assert getattr(client.http, method)(path, **kwargs).status_code == 404, (method, path)
    assert client.http.post(base + "/approve", json={"consent_summary_hash": "x"}).status_code == 404
    assert client.http.post(f"/api/v1/portfolio/{pid}/versions", json={"title": "x"}).status_code == 404
    assert client.http.get("/api/v1/portfolio").json() == []
    client.as_user("user-a")
    assert client.http.delete(f"/api/v1/portfolio/{pid}").status_code == 204
    assert not list((tmp_path / "files").rglob("*.zip"))  # export file removed with the portfolio
