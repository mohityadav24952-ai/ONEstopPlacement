"""Preview latency work: the faster fit search, the render cache and the template 4 analysis cache must give
exactly the same output as before, never stale output, and still always one page."""
import copy
import io
import json

import pytest
from pypdf import PdfReader

from app.modules.resume import review, template_routes
from app.modules.resume import templates as tpl
from tests.test_resume_templates import CONTENT, _resume_pdf
from tests.test_resume_versions import seed_profile

T = "/api/v1/resume/templates"
V = "/api/v1/resume/versions"


def _long(n_proj: int, n_bul: int) -> dict:
    c = copy.deepcopy(CONTENT)
    c["projects"] = [{"id": f"p{i}", "title": f"Project {i}", "tech": ["Python", "React"], "links": [],
                      "bullets": [{"id": f"p{i}#{j}", "text": "Engineered a scalable service with caching and tests " * 2}
                                  for j in range(n_bul)]} for i in range(n_proj)]
    return c


def _linear_fit(content: dict, profile: tpl.LayoutProfile) -> tuple[float, list[str]]:
    """The original one-by-one search, used as the reference answer."""
    s_min = min(1.0, tpl.MIN_BODY_PT / profile.body_size)
    steps = [1.0] + [round(1 - (1 - s_min) * i / 6, 3) for i in range(1, 7)] if s_min < 1.0 else [1.0]
    for scale in steps:
        if tpl._render_pages(content, tpl._scaled(profile, scale))[1] == 1:
            return scale, []
    small = tpl._scaled(profile, steps[-1])
    for cap in (4, 3, 2, 1):
        if tpl._render_pages(tpl._capped(content, cap), small)[1] == 1:
            return steps[-1], [f"bullets limited to {cap} per entry"]
    return steps[-1], ["<trimmed further>"]


@pytest.mark.parametrize("shape", [(1, 1), (3, 3), (5, 4), (6, 5), (8, 6), (10, 8)])
@pytest.mark.parametrize("name", ["classic", "intern", "modern"])
def test_fast_search_picks_exactly_what_the_linear_search_picked(shape, name):
    tpl.clear_render_cache()
    content = review.renderable(_long(*shape), final=False)
    profile = tpl.PRESETS[name]
    data, fit = tpl.render_resume_fit(content, profile)
    scale, trimmed = _linear_fit(content, profile)
    assert fit.scale == scale
    if trimmed != ["<trimmed further>"]:
        assert fit.trimmed == trimmed
    assert fit.pages == 1 and len(PdfReader(io.BytesIO(data)).pages) == 1


def test_page_count_comes_from_the_build():
    data, pages = tpl._render_pages(_long(12, 8), tpl.CLASSIC)
    assert pages == len(PdfReader(io.BytesIO(data)).pages) > 1


def test_cache_hits_ignore_bookkeeping_but_not_visible_changes():
    tpl.clear_render_cache()
    base = _long(2, 2)
    first = tpl.render_resume_fit(base, tpl.CLASSIC)[0]
    # an approval changes only a review state: same drawing, served from the cache
    approved = copy.deepcopy(base)
    approved["projects"][0]["bullets"][0]["review"] = "approved"
    assert tpl._cache_key(review.renderable(approved, final=False), tpl.CLASSIC) == \
        tpl._cache_key(review.renderable(base, final=False), tpl.CLASSIC)
    assert tpl.render_resume_fit(approved, tpl.CLASSIC)[0] == first
    # a rejection removes text from the page: a new render, without that text
    rejected = copy.deepcopy(base)
    rejected["projects"][0]["bullets"][0]["review"] = "rejected"
    rejected["projects"][0]["bullets"][0]["text"] = "Unique rejected sentence here"
    out = tpl.render_resume_fit(rejected, tpl.CLASSIC)[0]
    assert b"Unique rejected" not in out and out != first
    # an edit changes the text: a new render with the new words
    edited = copy.deepcopy(base)
    edited["projects"][0]["title"] = "Renamed Project"
    text = "".join(p.extract_text() for p in PdfReader(io.BytesIO(tpl.render_resume_fit(edited, tpl.CLASSIC)[0])).pages)
    assert "Renamed Project" in text
    # final mode is a different drawing from the preview when items are pending
    pending = copy.deepcopy(base)
    pending["projects"][1]["bullets"][0]["review"] = "pending"
    assert tpl.render_resume_fit(pending, tpl.CLASSIC, final=True)[0] != tpl.render_resume_fit(pending, tpl.CLASSIC)[0]


def test_cache_returns_copies_and_stays_bounded(monkeypatch):
    tpl.clear_render_cache()
    _, fit = tpl.render_resume_fit(_long(12, 8), tpl.CLASSIC)
    fit.trimmed.append("tampered")
    assert "tampered" not in tpl.render_resume_fit(_long(12, 8), tpl.CLASSIC)[1].trimmed
    monkeypatch.setattr(tpl, "RENDER_CACHE_SIZE", 3)
    for i in range(6):
        c = copy.deepcopy(CONTENT)
        c["header"] = {**c["header"], "name": f"Person {i}"}
        tpl.render_resume_fit(c, tpl.INTERN)
    assert len(tpl._cache) <= 3


def test_template_4_analysis_is_read_once_per_upload(client, monkeypatch):
    seed_profile(client)
    r = client.http.post("/api/v1/resume/documents", files={"file": ("base.pdf", _resume_pdf(), "application/pdf")})
    assert r.status_code in (200, 201)
    calls = []
    real = tpl.analyze_layout
    monkeypatch.setattr(tpl, "analyze_layout", lambda data, mime: calls.append(1) or real(data, mime))
    template_routes._analysis_cache.clear()
    vid = client.http.post(V, json={}).json()["id"]
    for _ in range(3):
        assert client.http.get(f"{T}/versions/{vid}/preview", params={"template_id": "clone"}).status_code == 200
    assert client.http.get(T).json()[3]["available"] is True
    assert len(calls) == 1


def test_preview_header_carries_the_fit_so_one_request_is_enough(client):
    seed_profile(client)
    vid = client.http.post(V, json={}).json()["id"]
    r = client.http.get(f"{T}/versions/{vid}/preview", params={"template_id": "intern"})
    fit = json.loads(r.headers["X-Resume-Fit"])
    assert fit == client.http.get(f"{T}/versions/{vid}/fit", params={"template_id": "intern"}).json()
    assert "X-Resume-Fit" in r.headers["Access-Control-Expose-Headers"]
