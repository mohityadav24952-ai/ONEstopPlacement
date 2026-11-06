"""Resume studio polish: skill detection, strict one-page PDFs, AI summary honesty, editability."""
import io
import json

from pypdf import PdfReader

from app.ai.llm import LLMResponse, get_llm_client
from app.modules.resume import parsing, summary as summary_mod
from app.modules.resume import templates as tpl
from app.modules.resume.skills import find_skills, normalize
from tests.test_resume_templates import CONTENT
from tests.test_resume_versions import make_analysis, seed_profile

V = "/api/v1/resume/versions"
T = "/api/v1/resume/templates"


# ---------------- skill detection ----------------
def test_cpp_is_found_however_the_pdf_spelled_it():
    for text in ["Languages: C, C++, Java", "C/C++", "C++17 and STL", "C ++", "C++/Python", "Python,C++", "C＋＋",
                 "C ++", "C++​", "cpp", "C++20,", "(C++)"]:
        assert "c++" in find_skills(text), text
    assert normalize("C++17") == "c++" and normalize("C ++") == "c++"
    for text in ["C+++", "I like cooking", "c plus"]:
        assert "c++" not in find_skills(text), text


def test_phrases_survive_line_wraps_and_common_skills_are_detected():
    assert "machine learning" in find_skills("Machine\nLearning")
    assert {"c#", "mongodb", "oop"} <= set(find_skills("C#, MongoDB, Object Oriented Programming"))
    assert "express" not in find_skills("express your interest") and "spring" not in find_skills("spring is here")


def test_grounding_keeps_a_skill_the_pdf_spaced_oddly():
    text = "Skills\nLanguages: C ++, Java"
    parsed = parsing.ParseOutput.model_validate({"skills": [{"name": "C++", "source_span": "Languages: C ++, Java", "confidence": "high"}]})
    kept = parsing.ground(parsed, text)
    assert [s["fields"]["name"] for s in kept["skills"]] == ["C++"]


def test_detected_skills_fill_what_the_ai_missed_without_duplicating():
    text = "Skills\nLanguages: C++, Java, Python\nProjects\nBuilt a Docker based tool in C++17"
    result = {"skills": [{"fields": {"name": "Python"}, "source_span": "Python", "confidence": "high"}], "needs_manual_entry": False}
    added = parsing.add_detected_skills(result, text)
    names = [s["fields"]["name"] for s in result["skills"]]
    assert added >= 3 and "C++" in names and "Java" in names and "Docker" in names
    assert len({n.lower() for n in names}) == len(names)  # Python was not added twice
    for s in result["skills"][1:]:
        assert s["source_span"] and s["source_span"] in text  # every added skill points at a real line of the resume
    assert parsing.add_detected_skills(result, text) == 0  # idempotent


# ---------------- one page ----------------
def _long(n_proj=9, n_bullets=6):
    c = json.loads(json.dumps(CONTENT))
    c["projects"] = [{"id": f"project:{i}", "title": f"Project number {i}", "tech": ["Python", "React", "SQL"], "links": [],
                      "bullets": [{"id": f"project:{i}#{j}", "text": "Built and shipped a feature that handled many requests and stored data safely " * 2}
                                  for j in range(n_bullets)]} for i in range(n_proj)]
    c["experience"] = [{"id": f"experience:{i}", "title": "Intern", "organization": f"Org {i}", "start_date": "2024-06-01", "end_date": "2024-08-01",
                        "bullets": [{"id": f"experience:{i}#{j}", "text": "Wrote reliable services and tests across the platform " * 2} for j in range(5)]}
                       for i in range(4)]
    return c


def _pages(data):
    return len(PdfReader(io.BytesIO(data)).pages)


def test_every_template_preset_is_one_page_even_for_long_content():
    for name, profile in tpl.PRESETS.items():
        data, fit = tpl.render_resume_fit(_long(), profile)
        assert _pages(data) == 1 and fit.pages == 1, name
        assert fit.scale < 1.0 or fit.trimmed, name  # it genuinely had to adapt


def test_short_content_is_left_untouched():
    for profile in tpl.PRESETS.values():
        data, fit = tpl.render_resume_fit(CONTENT, profile)
        assert _pages(data) == 1 and fit.scale == 1.0 and fit.trimmed == []


def test_text_is_never_shrunk_below_8pt():
    for profile in tpl.PRESETS.values():
        assert tpl._scaled(profile, 0.1).body_size >= tpl.MIN_BODY_PT


def test_trimming_only_happens_after_shrinking_and_is_reported():
    data, fit = tpl.render_resume_fit(_long(9, 8), tpl.CLASSIC)
    assert fit.pages == 1
    if fit.trimmed:
        assert fit.scale == round(1 - (1 - tpl.MIN_BODY_PT / tpl.CLASSIC.body_size), 3)  # the smallest size was tried first


def test_preview_and_export_report_the_fit(client):
    seed_profile(client)
    a = make_analysis(client)
    v = client.http.post(V, json={"analysis_id": a["id"]}).json()
    r = client.http.get(f"{T}/versions/{v['id']}/preview", params={"template_id": "classic"})
    assert r.status_code == 200 and json.loads(r.headers["X-Resume-Fit"])["pages"] == 1
    general = client.http.post(V, json={}).json()  # a version without a JD has no unresolved claim flags, so it can be approved
    assert client.http.post(f"{V}/{general['id']}/approve").status_code == 200
    out = client.http.post(f"{T}/versions/{general['id']}/export", json={"template_id": "intern"})
    assert out.status_code == 200 and out.json()["fit"]["pages"] == 1


# ---------------- AI summary ----------------
class _Say:
    provider, model = "t", "t"

    def __init__(self, text):
        self.text = text

    def generate_json(self, req):
        if req.workflow != "resume_summary":
            return LLMResponse(text=json.dumps({"proposals": [], "requirements": []}), model="t")
        return LLMResponse(text=json.dumps({"summary": self.text, "evidence_ids": []}), model="t")


def _create(app, client, text, seeded=False):
    app.dependency_overrides[get_llm_client] = lambda: _Say(text)
    if not seeded:
        seed_profile(client)
    if seeded:  # the same JD again is deduplicated (200), so build the analysis by hand
        from tests.test_resume_versions import JD
        jd = client.http.post("/api/v1/job-descriptions", json={"text": JD, "role_title": "Backend Intern", "company": "Acme"}).json()
        a = client.http.post("/api/v1/resume/analyses", json={"jd_id": jd["id"]}).json()
    else:
        a = make_analysis(client)
    return client.http.post(V, json={"analysis_id": a["id"]}).json()


def test_a_grounded_summary_is_used_and_marked_as_ai(app, client):
    v = _create(app, client, "Backend student skilled in Python and SQL, who built REST APIs with FastAPI. Targeting a Backend Intern role.")
    s = v["content"]["summary"]
    assert s["source"] == "ai" and s["ai_generated"] is True and "FastAPI" in s["text"]


def test_a_summary_that_invents_things_is_replaced_by_a_plain_one(app, client):
    seed_profile(client)
    for lie in ["Senior engineer with 7 years of experience in Python.",       # number
                "Backend student skilled in Python and Kubernetes.",             # skill the candidate lacks
                "Backend student who interned at Google building Python APIs.",  # proper noun not in the facts
                "Student. " * 5,                                                 # too many sentences
                ]:
        s = _create(app, client, lie, seeded=True)["content"]["summary"]
        assert s["source"] == "template" and s["ai_generated"] is False, lie
        assert "7 years" not in s["text"] and "Google" not in s["text"] and "Kubernetes" not in s["text"]


def test_fallback_summary_uses_only_profile_content(client):
    seed_profile(client)
    a = make_analysis(client)
    v = client.http.post(V, json={"analysis_id": a["id"]}).json()  # the default mock model returns nothing usable
    s = v["content"]["summary"]
    assert s["source"] == "template" and "Python" in s["text"] and "Backend Intern" in s["text"]
    assert 20 < len(s["text"]) <= summary_mod.MAX_CHARS


def test_summary_can_be_regenerated_and_edited_by_hand(app, client):
    v = _create(app, client, "Backend student skilled in Python who built REST APIs with FastAPI.")
    app.dependency_overrides[get_llm_client] = lambda: _Say("Student skilled in Python and SQL.")
    r = client.http.post(f"{V}/{v['id']}/summary")
    assert r.status_code == 200 and r.json()["content"]["summary"]["text"] == "Student skilled in Python and SQL."
    e = client.http.patch(f"{V}/{v['id']}", json={"summary": "My own words about me."})
    assert e.json()["content"]["summary"]["text"] == "My own words about me." and e.json()["content"]["summary"]["user_edited"] is True


def test_everything_in_the_resume_can_be_edited_before_export(app, client):
    v = _create(app, client, "Backend student skilled in Python.")
    bullet = v["content"]["projects"][0]["bullets"][0]["id"]
    r = client.http.patch(f"{V}/{v['id']}", json={"bullet_edits": {bullet: "Rewrote by hand"}, "title": "Renamed"})
    assert r.status_code == 200 and r.json()["title"] == "Renamed"
    f = client.http.patch(f"{T}/versions/{v['id']}/fields", json={"name": "Asha V", "headline": "New headline", "location": "Delhi"})
    assert f.json()["content"]["header"]["name"] == "Asha V"
    pdf = client.http.get(f"{T}/versions/{v['id']}/preview", params={"template_id": "modern"}).content
    text = "".join(p.extract_text() for p in PdfReader(io.BytesIO(pdf)).pages)
    assert "Rewrote by hand" in text and "Asha V" in text


def test_fit_endpoint_reports_one_page(client):
    seed_profile(client)
    v = client.http.post(V, json={}).json()
    for template in ("classic", "intern", "modern"):
        r = client.http.get(f"{T}/versions/{v['id']}/fit", params={"template_id": template})
        assert r.status_code == 200 and r.json() == {"pages": 1, "scale": 1.0, "trimmed": []}
