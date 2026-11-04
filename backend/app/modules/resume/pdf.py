"""ATS-friendly resume PDF: single column, real text, standard fonts, no tables or images."""
import io
from xml.sax.saxutils import escape

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import ListFlowable, ListItem, Paragraph, SimpleDocTemplate, Spacer

H1 = ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=18, leading=22)
SUB = ParagraphStyle("sub", fontName="Helvetica", fontSize=10, leading=13)
H2 = ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=12, leading=16, spaceBefore=10, spaceAfter=3)
BODY = ParagraphStyle("body", fontName="Helvetica", fontSize=10, leading=13)
BOLD = ParagraphStyle("bold", parent=BODY, fontName="Helvetica-Bold")


def _p(text: str, style=BODY) -> Paragraph:
    return Paragraph(escape(text), style)  # escaped: user text is never interpreted as markup


def _dates(item: dict) -> str:
    start, end = item.get("start_date"), item.get("end_date")
    return " - ".join(x[:7] for x in (start, end) if x)


def _bullets(items: list[dict]):
    return ListFlowable(
        [ListItem(_p(b["text"]), leftIndent=12) for b in items], bulletType="bullet", start="•", leftIndent=12
    )


def render_pdf(content: dict) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=16 * mm,
        title=content.get("header", {}).get("name") or "Resume", invariant=1,
    )
    story: list = []
    h = content.get("header", {})
    story.append(_p(h.get("name") or "Resume", H1))
    line = " | ".join(x for x in (h.get("headline"), h.get("email"), h.get("location")) if x)
    if line:
        story.append(_p(line, SUB))
    summary = content.get("summary", {}).get("text")
    if summary:
        story += [_p("Summary", H2), _p(summary)]
    if content.get("education"):
        story.append(_p("Education", H2))
        for e in content["education"]:
            title = ", ".join(x for x in (e.get("degree"), e.get("field")) if x)
            story.append(_p(" - ".join(x for x in (e["institution"], title, _dates(e), e.get("grade")) if x)))
    if content.get("experience"):
        story.append(_p("Experience", H2))
        for e in content["experience"]:
            story.append(_p(" | ".join(x for x in (e["title"], e["organization"], _dates(e)) if x), BOLD))
            if e.get("bullets"):
                story.append(_bullets(e["bullets"]))
            story.append(Spacer(1, 3))
    if content.get("projects"):
        story.append(_p("Projects", H2))
        for p in content["projects"]:
            head = p["title"] + (f" ({', '.join(p['tech'])})" if p.get("tech") else "")
            story.append(_p(head, BOLD))
            if p.get("bullets"):
                story.append(_bullets(p["bullets"]))
            story.append(Spacer(1, 3))
    if content.get("skills"):
        story += [_p("Skills", H2), _p(", ".join(content["skills"]))]
    if content.get("achievements"):
        story.append(_p("Achievements", H2))
        for a in content["achievements"]:
            story.append(_p(" - ".join(x for x in (a["title"], a.get("issuer")) if x)))
    doc.build(story)
    return buf.getvalue()
