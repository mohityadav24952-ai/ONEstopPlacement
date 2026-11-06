"""The default resume PDF (POST /resume/versions/{id}/pdf, used when no template was picked).

It is the Classic template rendered in final mode, so it follows exactly the same rules as the template
picker: one page, de-duplicated, sub-categorised skills, right-aligned dates, and ONLY items that are approved
in the checklist or required by the job description. Real text with standard fonts, so it stays ATS-readable.
"""
from app.modules.resume import templates


def render_pdf(content: dict) -> bytes:
    return templates.render_resume(content, templates.CLASSIC, final=True)
