"""Resume Studio overhaul: de-duplication, skill categories, sentence-safe bullets, LaTeX hyperlinks,
JD hard-inclusion, the approval checklist, the two layout variations and the action-verb wording standard."""
import io

from pypdf import PdfReader

from app.modules.resume import latex, parsing, review, templates as tpl, validator
from app.modules.resume.skills import categorize, group_skills
from app.modules.resume.text import split_points
from tests.test_resume_templates import CONTENT
from tests.test_resume_versions import make_analysis, review_all, seed_profile

V = "/api/v1/resume/versions"
T = "/api/v1/resume/templates"
D = "/api/v1/resume/documents"


def _text(pdf: bytes) -> str:
    return "\n".join(p.extract_text() for p in PdfReader(io.BytesIO(pdf)).pages)


# ---- bullets and parsing ------------------------------------------------------------------------

def test_wrapped_lines_never_split_a_sentence():
    text = ("Built an AI-powered cloud IDE featuring Monaco\nEditor, WebContainers, and multi-language code execution. "
            "Integrated\nAI-powered code suggestions and file management.\nTechnologies: Next.js, TypeScript.")
    assert split_points(text) == [
        "Built an AI-powered cloud IDE featuring Monaco Editor, WebContainers, and multi-language code execution.",
        "Integrated AI-powered code suggestions and file management.",
    ]
    assert split_points("Pursuing B.Tech. in CSE. Used e.g. Node.js daily.") == ["Pursuing B.Tech. in CSE.", "Used e.g. Node.js daily."]
    assert split_points("• Built X with FastAPI · SQLite\n• Built X with FastAPI · SQLite") == ["Built X with FastAPI · SQLite"]


def test_parsed_duplicates_are_merged_into_one_item():
    src = "Graphic Era University B.Tech\nTracker app\nBuilt a tracker in Python.\nAdded charts.\nPython"
    out = parsing.ParseOutput(
        education=[{"institution": "Graphic Era University", "degree": "B.Tech", "source_span": "Graphic Era University B.Tech", "confidence": "high"}] * 3,
        projects=[
            {"title": "Tracker", "points": ["Built a tracker in Python."], "source_span": "Tracker app", "confidence": "medium"},
            {"title": "tracker", "points": ["Added charts."], "tech": ["Python"], "source_span": "Tracker app", "confidence": "high"},
        ],
        skills=[{"name": "Python", "category": "Programming Languages", "source_span": "Python", "confidence": "high"}] * 2,
    )
    g = parsing.ground(out, src)
    assert len(g["education"]) == 1 and len(g["projects"]) == 1 and len(g["skills"]) == 1
    proj = g["projects"][0]["fields"]
    assert proj["description"] == "Built a tracker in Python. Added charts." and proj["tech"] == ["Python"]
    assert g["skills"][0]["fields"]["category"] == "Languages"  # the AI's label, folded onto the standard heading


def test_skills_are_sub_categorised():
    assert categorize("C++") == "Languages" and categorize("React.js") == "Frameworks & Libraries"
    assert categorize("MongoDB") == "Backend & Databases" and categorize("Git") == "Developer Tools"
    assert categorize("Data Structures & Algorithms") == "Core CS Concepts" and categorize("Docker (Basic)") == "Cloud & DevOps"
    assert categorize("LangChain", "Currently Learning") == "Currently Learning"  # the user's own grouping is kept
    groups = group_skills(["Python", "Git", "OOP", "Mystery"], {})
    assert [g["category"] for g in groups] == ["Languages", "Developer Tools", "Core CS Concepts", "Other"]


def test_importing_the_same_resume_twice_creates_no_duplicates(client):
    body = {"items": {
        "education": [{"institution": "Graphic Era University", "degree": "B.Tech"}, {"institution": "graphic era university", "degree": "B.Tech."}],
        "projects": [{"title": "Tracker"}, {"title": "Tracker"}],
        "skills": [{"name": "Python", "category": "Languages"}],
    }}
    from tests.helpers import make_pdf, upload
    doc = upload(client, make_pdf()).json()
    first = client.http.post(f"{D}/{doc['id']}/import", json=body).json()
    again = client.http.post(f"{D}/{doc['id']}/import", json=body).json()
    assert first == {"proposals_created": 3, "skipped_duplicates": 2}
    assert again == {"proposals_created": 0, "skipped_duplicates": 5}  # pending proposals count as existing


def test_duplicate_profile_entries_render_once(client):
    seed_profile(client)
    client.http.post("/api/v1/profile/education", json={"institution": "Graphic Era University", "degree": "B.Tech"})
    client.http.post("/api/v1/profile/projects", json={"title": "Tracker", "tech": ["Python"], "description": "web app for applications. Added CSV export."})
    v = client.http.post(V, json={}).json()
    c = v["content"]
    assert len(c["education"]) == 1 and len(c["projects"]) == 1
    texts = [b["text"] for b in c["projects"][0]["bullets"]]
    assert texts == ["web app for applications", "Added CSV export."]  # merged, the repeated sentence once


# ---- LaTeX hyperlinks ---------------------------------------------------------------------------

TEX = r"""
\documentclass{article}
% \href{https://evil.example}{commented out}
\begin{document}
\href{mailto:asha@example.com}{asha@example.com} $|$ \href{https://github.com/asha}{\underline{GitHub}} $|$
\href{https://linkedin.com/in/asha}{LinkedIn} \url{https://leetcode.com/u/asha}
\href{javascript:alert(1)}{bad} \href{https://github.com/asha/tracker}{\textbf{Tracker}}
\end{document}
"""


def test_latex_links_are_extracted_safely():
    links = latex.extract_links(TEX)
    assert [(x["text"], x["url"]) for x in links] == [
        ("asha@example.com", "mailto:asha@example.com"), ("GitHub", "https://github.com/asha"),
        ("LinkedIn", "https://linkedin.com/in/asha"), ("LeetCode", "https://leetcode.com/u/asha"),
        ("Tracker", "https://github.com/asha/tracker"),
    ]
    assert all(x["status"] == "pending" for x in links)


def test_latex_links_need_permission_before_they_reach_a_resume(client):
    from tests.helpers import make_pdf, upload
    seed_profile(client)
    doc = upload(client, make_pdf()).json()
    assert client.http.post(f"{D}/{doc['id']}/latex", files={"file": ("cv.txt", b"x", "text/plain")}).status_code == 415
    r = client.http.post(f"{D}/{doc['id']}/latex", files={"file": ("cv.tex", TEX.encode(), "application/x-tex")})
    assert r.status_code == 200 and len(r.json()["latex_links"]) == 5
    # nothing approved yet: no links on a new draft
    assert client.http.post(V, json={}).json()["content"]["links"] == []
    d = client.http.post(f"{D}/{doc['id']}/latex/decisions", json={"decisions": {
        "https://github.com/asha": "approved", "https://github.com/asha/tracker": "approved", "https://linkedin.com/in/asha": "rejected"}})
    assert d.status_code == 200
    assert client.http.post(f"{D}/{doc['id']}/latex/decisions", json={"decisions": {"https://x.example": "approved"}}).status_code == 422
    v = client.http.post(V, json={}).json()
    assert {x["url"] for x in v["content"]["links"]} == {"https://github.com/asha", "https://github.com/asha/tracker"}
    review_all(client, v["id"])
    pdf = client.http.get(f"{T}/versions/{v['id']}/preview", params={"template_id": "intern"}).content
    annots = [a.get_object()["/A"]["/URI"] for p in PdfReader(io.BytesIO(pdf)).pages for a in p.get("/Annots") or []]
    assert "https://github.com/asha" in annots and "https://github.com/asha/tracker" in annots
    assert "https://linkedin.com/in/asha" not in annots


# ---- JD hard inclusion and the approval checklist -----------------------------------------------

def test_jd_matches_are_locked_and_everything_else_needs_approval(client):
    seed_profile(client)
    a = make_analysis(client)
    v = client.http.post(V, json={"analysis_id": a["id"]}).json()
    meta = v["content"]["skill_meta"]
    assert meta["Python"]["review"] == "locked" and meta["SQL"]["review"] == "locked"  # both named in the JD
    fastapi_bullet = next(b for e in v["content"]["experience"] for b in e["bullets"] if "FastAPI" in b["text"])
    assert fastapi_bullet["review"] == "locked" and "fastapi" in fastapi_bullet["jd"]
    other = next(b for e in v["content"]["experience"] for b in e["bullets"] if b["text"] == "wrote unit tests")
    assert other["review"] == "pending"
    vid = v["id"]
    # locked items cannot be rejected, removed, or dropped from the skills list
    assert client.http.post(f"{V}/{vid}/review", json={"decisions": {"skill:Python": "rejected"}}).status_code == 409
    assert client.http.patch(f"{V}/{vid}", json={"remove_ids": [fastapi_bullet["id"]]}).status_code == 409
    assert client.http.patch(f"{T}/versions/{vid}/fields", json={"skills": ["SQL"]}).status_code == 409
    # approval is blocked until every pending item is decided
    client.http.post(f"{V}/{vid}/flags/f1/resolve", json={"resolution": "dismiss"})
    blocked = client.http.post(f"{V}/{vid}/approve")
    assert blocked.status_code == 409 and blocked.json()["error"]["code"] == "UNREVIEWED_ITEMS"
    # reject one item: the preview no longer shows it, and the final PDF never does
    r = client.http.post(f"{V}/{vid}/review", json={"decisions": {other["id"]: "rejected"}})
    assert r.status_code == 200
    assert "wrote unit tests" not in _text(client.http.get(f"{T}/versions/{vid}/preview", params={"template_id": "classic"}).content)
    review_all(client, vid)
    assert client.http.post(f"{V}/{vid}/approve").status_code == 200
    final = client.http.post(f"{T}/versions/{vid}/export", json={"template_id": "intern"})
    assert final.status_code == 200
    text = _text(client.http.get(f"{V}/{vid}/pdf").content)
    assert "FastAPI" in text and "wrote unit tests" not in text


def test_pending_items_never_reach_the_final_pdf():
    content = {**CONTENT, "experience": [{**CONTENT["experience"][0], "bullets": [
        {"id": "x#0", "text": "Approved bullet text", "review": "approved"},
        {"id": "x#1", "text": "Pending bullet text", "review": "pending"},
        {"id": "x#2", "text": "Rejected bullet text", "review": "rejected"}]}]}
    preview = _text(tpl.render_resume(content, tpl.CLASSIC, final=False))
    final = _text(tpl.render_resume(content, tpl.CLASSIC, final=True))
    assert "Approved bullet text" in preview and "Pending bullet text" in preview and "Rejected bullet text" not in preview
    assert "Approved bullet text" in final and "Pending bullet text" not in final and "Rejected bullet text" not in final


def test_user_edits_count_as_approval(client):
    seed_profile(client)
    v = client.http.post(V, json={}).json()
    b = v["content"]["experience"][0]["bullets"][1]
    after = client.http.patch(f"{V}/{v['id']}", json={"bullet_edits": {b["id"]: "Wrote unit tests for the API layer."}}).json()
    assert next(i for i in after["review_items"] if i["id"] == b["id"])["review"] == "approved"


# ---- layout variations --------------------------------------------------------------------------

ACH = [
    {"id": "a1", "title": "Knight badge on LeetCode with a peak rating of 1900+"},
    {"id": "a2", "title": "All India Rank 269 in the NDA examination"},
    {"id": "a3", "title": "Agentic AI Foundations Associate", "issuer": "Oracle University", "type": "CERTIFICATION"},
]


def test_mohit_style_order_and_no_summary():
    c = {**CONTENT, "achievements": ACH}
    text = _text(tpl.render_resume(c, tpl.INTERN)).upper()
    order = ["EDUCATION", "SKILLS", "PROJECTS", "CODING PROFILES", "LEADERSHIP / ACHIEVEMENTS"]
    assert sorted(order, key=text.index) == order
    assert "SUMMARY" not in text and "STUDENT WHO BUILDS APIS" not in text
    assert "TECH STACK: PYTHON, REACT" in text


def test_shrey_style_order_with_summary_and_certifications():
    c = {**CONTENT, "achievements": ACH}
    text = _text(tpl.render_resume(c, tpl.CLASSIC)).upper()
    order = ["PROFESSIONAL SUMMARY", "EDUCATION", "PROJECTS", "EXPERIENCE", "TECHNICAL SKILLS", "CERTIFICATIONS"]
    assert sorted(order, key=text.index) == order
    assert "ORACLE UNIVERSITY: AGENTIC AI FOUNDATIONS ASSOCIATE" in text


def test_skills_render_as_categories_not_one_paragraph():
    c = {**CONTENT, "skills": ["Python", "Git", "MongoDB"], "skill_meta": {}}
    text = _text(tpl.render_resume(c, tpl.CLASSIC))
    assert "Languages: Python" in text and "Developer Tools: Git" in text and "Backend & Databases: MongoDB" in text


def test_dates_are_month_year_and_right_aligned():
    assert tpl._dates({"start_date": "2024-07-01", "end_date": "2028-06-01"}) == "Jul 2024 – Jun 2028"


# ---- wording standard ---------------------------------------------------------------------------

def test_rewordings_must_open_with_an_action_verb():
    assert validator.action_verb_issue("Architected a multi-agent pipeline.") is None
    assert validator.action_verb_issue("Built a tracker.") is None
    assert validator.action_verb_issue("Responsible for building a tracker.") == "weak opener"
    assert validator.action_verb_issue("A tracker app built in Python.") == "weak opener"
    assert validator.action_verb_issue("Tracker app in Python.") == "does not start with an action verb"
    p = validator.ProposalIn(target="b1", before="worked on a tracker in Python", after="Worked on a tracker in Python.", evidence_ids=["b1"])
    assert validator.reject_reason(p, {"b1": "worked on a tracker in Python"}, {"b1": "worked on a tracker in Python"}) == "weak opener"


def test_review_state_defaults_keep_old_versions_working():
    legacy = {"summary": {"text": "x"}, "education": [{"id": "e", "institution": "U"}], "experience": [], "projects": [],
              "skills": ["Python"], "achievements": []}
    assert review.pending_count(legacy) == 0 and len(review.renderable(legacy, final=True)["skills"]) == 1
