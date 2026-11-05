"""Resume templates: four looks, one set of honest content."""
import io

import pytest
from pypdf import PdfReader
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from app.modules.resume import templates as tpl
from app.shared import documents as doc_utils
from tests.test_resume_versions import seed_profile

T = "/api/v1/resume/templates"
V = "/api/v1/resume/versions"


def _resume_pdf(font="Times-Roman", bold="Times-Bold", centred=True, upper=True, rules=True, size=10) -> bytes:
    """A small but realistic resume laid out the way a LaTeX-style or a plain sans resume looks."""
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4, invariant=1)
    w, y = A4[0], 800

    def line(text, f=font, s=size, x=50, centre=False):
        c.setFont(f, s)
        if centre:
            c.drawCentredString(w / 2, y, text)
        else:
            c.drawString(x, y, text)

    line("Asha Verma", bold, 22, centre=centred)
    y -= 16
    line("asha@example.com | Dehradun", font, size, centre=centred)
    y -= 26
    for heading, body in (("Education", ["Graphic Era University, B.Tech"]), ("Experience", ["Backend Intern, Acme", "- built APIs"]),
                          ("Projects", ["Tracker", "- web app"]), ("Skills", ["Python, SQL"])):
        line(heading.upper() if upper else heading, bold, 11.5)
        if rules:
            c.setLineWidth(0.6)
            c.line(50, y - 3, w - 50, y - 3)
        y -= 16
        for b in body:
            line(b)
            y -= 13
        c.setFont(font, size)
        c.drawRightString(w - 50, y + 13, "2023 - 2024")
        y -= 8
    c.save()
    return buf.getvalue()


CONTENT = {
    "header": {"name": "Asha Verma", "headline": "Backend student", "email": "asha@example.com", "location": "Dehradun"},
    "summary": {"text": "Student who builds APIs.", "id": "summary"},
    "education": [{"id": "education:1", "institution": "Graphic Era University", "degree": "B.Tech", "field": None,
                   "start_date": "2024-08-01", "end_date": None, "grade": None}],
    "experience": [{"id": "experience:1", "title": "Intern", "organization": "Acme", "start_date": "2025-06-01", "end_date": "2025-08-01",
                    "bullets": [{"id": "experience:1#0", "text": "built REST APIs with FastAPI"}]}],
    "projects": [{"id": "project:1", "title": "Tracker", "tech": ["Python", "React"], "links": [],
                  "bullets": [{"id": "project:1#0", "text": "web app for applications <b>x</b> & more"}]}],
    "skills": ["Python", "SQL"],
    "achievements": [{"id": "achievement:1", "title": "Hackathon winner", "issuer": "GEU"}],
}


def _text(pdf: bytes) -> str:
    return "\n".join(p.extract_text() for p in PdfReader(io.BytesIO(pdf)).pages)


@pytest.mark.parametrize("name", ["classic", "intern", "modern"])
def test_presets_render_valid_pdfs_with_all_content(name):
    out = tpl.render_resume(CONTENT, tpl.PRESETS[name])
    assert out.startswith(b"%PDF-")
    text = _text(out)
    for needle in ("Asha Verma", "Graphic Era University", "Intern", "FastAPI", "Tracker", "Python", "Hackathon winner", "Student who builds APIs."):
        assert needle in text
    assert "<b>x</b>" in text  # user text is escaped, never interpreted as markup


def test_templates_differ_in_look_and_order():
    def order(name):
        text = _text(tpl.render_resume(CONTENT, tpl.PRESETS[name])).upper()
        return sorted(["EDUCATION", "EXPERIENCE", "PROJECTS", "SKILLS"], key=text.index)

    assert order("classic") == ["EDUCATION", "EXPERIENCE", "PROJECTS", "SKILLS"]
    assert order("intern") == ["SKILLS", "PROJECTS", "EXPERIENCE", "EDUCATION"]
    assert order("modern") == ["PROJECTS", "EXPERIENCE", "SKILLS", "EDUCATION"]
    fonts = {n: {str(f.get("/BaseFont")) for p in PdfReader(io.BytesIO(tpl.render_resume(CONTENT, tpl.PRESETS[n]))).pages
                 for f in (r.get_object() for r in p["/Resources"]["/Font"].values())} for n in ("classic", "intern")}
    assert any("Times" in f for f in fonts["classic"]) and not any("Times" in f for f in fonts["intern"])


def test_analyze_serif_centered_upper_ruled_resume():
    a = tpl.analyze_layout(_resume_pdf(), doc_utils.PDF)
    assert a is not None
    p = a.profile
    assert p.font_family == "serif" and p.name_align == "center" and p.heading_case == "upper" and p.heading_rule is True
    assert p.section_order == ["education", "experience", "projects", "skills"]
    assert p.date_align == "right" and 21 <= p.name_size <= 23
    assert any("serif" in m for m in a.matched) and any("sections: Education, Experience, Projects, Skills" in m for m in a.matched)


def test_analyze_sans_left_title_case_resume():
    a = tpl.analyze_layout(_resume_pdf("Helvetica", "Helvetica-Bold", centred=False, upper=False, rules=False), doc_utils.PDF)
    assert a is not None
    p = a.profile
    assert p.font_family == "sans" and p.name_align == "left" and p.heading_case == "title" and p.heading_rule is False


def test_analyze_unreadable_file_is_none():
    assert tpl.analyze_layout(b"%PDF-1.4 garbage", doc_utils.PDF) is None
    blank = io.BytesIO()
    c = canvas.Canvas(blank, pagesize=A4)
    c.drawString(50, 800, "just one line")
    c.save()
    assert tpl.analyze_layout(blank.getvalue(), doc_utils.PDF) is None


def test_clone_render_reuses_the_uploaded_look():
    a = tpl.analyze_layout(_resume_pdf(), doc_utils.PDF)
    out = tpl.render_resume(CONTENT, a.profile)
    text = _text(out)
    assert text.index("EDUCATION") < text.index("EXPERIENCE") < text.index("PROJECTS") < text.index("SKILLS")
    assert "Hackathon winner" in text  # a section the original lacked is appended, not dropped


def test_docx_analysis():
    import docx
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.shared import Pt

    d = docx.Document()
    d.styles["Normal"].font.name = "Times New Roman"
    d.styles["Normal"].font.size = Pt(11)
    d.add_paragraph("Asha Verma").alignment = WD_ALIGN_PARAGRAPH.CENTER
    for h in ("EDUCATION", "EXPERIENCE", "SKILLS"):
        p = d.add_paragraph()
        r = p.add_run(h)
        r.bold = True
        d.add_paragraph("Something under the heading")
    buf = io.BytesIO()
    d.save(buf)
    a = tpl.analyze_layout(buf.getvalue(), doc_utils.DOCX)
    assert a is not None and a.profile.font_family == "serif" and a.profile.name_align == "center"
    assert a.profile.section_order == ["education", "experience", "skills"] and a.profile.heading_case == "upper"


# ---- API --------------------------------------------------------------------------------------------

def _upload(client, data: bytes, name="base.pdf"):
    r = client.http.post("/api/v1/resume/documents", files={"file": (name, data, "application/pdf")})
    assert r.status_code in (200, 201), r.text
    return r.json()


def _approved_version(client) -> str:
    seed_profile(client)
    vid = client.http.post(V, json={}).json()["id"]
    assert client.http.post(f"{V}/{vid}/approve").status_code == 200
    return vid


def test_list_has_exactly_four_and_clone_unavailable_without_upload(client):
    r = client.http.get(T)
    assert r.status_code == 200
    items = r.json()
    assert [t["id"] for t in items] == ["classic", "intern", "modern", "clone"]
    clone = items[3]
    assert clone["available"] is False and "Upload your resume" in clone["reason"]
    assert all(t["available"] for t in items[:3])


def test_clone_available_after_upload_with_matched_summary(client):
    base = _upload(client, _resume_pdf(), "my_resume.pdf")
    clone = client.http.get(T).json()[3]
    assert clone["available"] is True and clone["source_name"] == "my_resume.pdf" and clone["document_id"] == base["id"]
    assert "not a pixel-perfect copy" in clone["note"] and any("sections:" in m for m in clone["matched"])


def test_clone_unavailable_when_layout_unreadable(client):
    blank = io.BytesIO()
    c = canvas.Canvas(blank, pagesize=A4)
    for i in range(12):  # plenty of text, but no recognisable resume sections
        c.drawString(50, 800 - 16 * i, f"Line {i}: this page is prose with no section headings in it at all.")
    c.save()
    _upload(client, blank.getvalue())
    clone = client.http.get(T).json()[3]
    assert clone["available"] is False and "could not read" in clone["reason"].lower()


def test_preview_works_on_drafts_and_reflects_edits(client):
    seed_profile(client)
    vid = client.http.post(V, json={}).json()["id"]
    r = client.http.get(f"{T}/versions/{vid}/preview", params={"template_id": "modern"})
    assert r.status_code == 200 and r.headers["content-type"] == "application/pdf"
    assert "Asha Verma" in _text(r.content)
    client.http.patch(f"{V}/{vid}", json={"summary": "Freshly edited summary."})
    assert "Freshly edited summary." in _text(client.http.get(f"{T}/versions/{vid}/preview", params={"template_id": "classic"}).content)
    assert client.http.get(f"{T}/versions/{vid}/preview", params={"template_id": "nope"}).status_code == 422


def test_export_each_template_and_download(client):
    _upload(client, _resume_pdf())
    vid = _approved_version(client)
    for tid in ("classic", "intern", "modern", "clone"):
        r = client.http.post(f"{T}/versions/{vid}/export", json={"template_id": tid})
        assert r.status_code == 200, r.text
        assert r.json()["template_id"] == tid and r.json()["has_pdf"]
        dl = client.http.get(f"{V}/{vid}/pdf")
        assert dl.status_code == 200 and "Asha Verma" in _text(dl.content)


def test_export_clone_blocked_without_a_base_document(client):
    vid = _approved_version(client)
    r = client.http.post(f"{T}/versions/{vid}/export", json={"template_id": "clone"})
    assert r.status_code == 409 and r.json()["error"]["code"] == "TEMPLATE_UNAVAILABLE"


def test_export_requires_approval_and_default_export_unchanged(client):
    seed_profile(client)
    vid = client.http.post(V, json={}).json()["id"]
    r = client.http.post(f"{T}/versions/{vid}/export", json={"template_id": "classic"})
    assert r.status_code == 409 and r.json()["error"]["code"] == "NOT_APPROVED"
    client.http.post(f"{V}/{vid}/approve")
    assert client.http.post(f"{V}/{vid}/pdf").status_code == 200  # the original endpoint still works, no template needed
    assert client.http.get(f"{V}/{vid}").json()["template_id"] is None


def test_edit_fields_validated_and_draft_only(client):
    seed_profile(client)
    vid = client.http.post(V, json={}).json()["id"]
    r = client.http.patch(f"{T}/versions/{vid}/fields", json={"name": "Asha V.", "location": "Delhi", "skills": ["SQL", "Python"]})
    assert r.status_code == 200
    c = r.json()["content"]
    assert c["header"]["name"] == "Asha V." and c["header"]["location"] == "Delhi" and c["skills"] == ["SQL", "Python"]
    assert "Asha V." in _text(client.http.get(f"{T}/versions/{vid}/preview", params={"template_id": "classic"}).content)
    # a skill that is not in the profile cannot be typed onto a resume
    bad = client.http.patch(f"{T}/versions/{vid}/fields", json={"skills": ["Python", "Kubernetes"]})
    assert bad.status_code == 422
    assert client.http.patch(f"{T}/versions/{vid}/fields", json={"role": "x"}).status_code == 422
    client.http.post(f"{V}/{vid}/approve")
    assert client.http.patch(f"{T}/versions/{vid}/fields", json={"name": "Z"}).status_code == 409


def test_edits_still_go_through_the_existing_bullet_validation(client):
    seed_profile(client)
    v = client.http.post(V, json={}).json()
    bid = v["content"]["experience"][0]["bullets"][0]["id"]
    assert client.http.patch(f"{V}/{v['id']}", json={"bullet_edits": {bid: " "}}).status_code == 422
    assert client.http.patch(f"{V}/{v['id']}", json={"bullet_edits": {"experience:x#9": "hi"}}).status_code == 422


def test_templates_are_isolated_per_user(client):
    seed_profile(client)
    vid = client.http.post(V, json={}).json()["id"]
    client.as_user("user-b")
    assert client.http.get(f"{T}/versions/{vid}/preview", params={"template_id": "classic"}).status_code == 404
    assert client.http.patch(f"{T}/versions/{vid}/fields", json={"name": "x"}).status_code == 404
