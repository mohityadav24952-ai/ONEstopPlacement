"""Resume templates: four looks rendered from the SAME approved content, each always on ONE page.

1 classic - Professional (Shrey/Aditya style): Professional Summary -> Education -> Projects -> Experience ->
            Technical Skills (sub-categorised) -> Certifications. Serif, centred capitalised name, ruled headings.
2 intern  - Tech Intern (Mohit style): NO summary. Education -> Skills (sub-categorised) -> Projects
            (title + tech stack + bullets) -> Coding Profiles -> Leadership / Achievements. Clean sans, accent colour.
3 modern  - Modern Developer: the same section order as Tech Intern with a modern look (accent header band,
            tinted section headings), no summary.
4 clone   - A close match to the user's uploaded resume, built from a LayoutProfile that `analyze_layout`
            reads from that file.

Rules every template follows: standard PDF fonts (real, selectable, ATS-readable text), distinct section headings,
dates right-aligned in their own column (sized to the date, so text never overlaps it), each bullet a whole
sentence that wraps naturally (no hard line breaks), and hyperlinks only where the user allowed them. Only the
look changes between templates: the words always come from the version's content, so the honesty rules that
apply to the content apply to every template. Text is escaped before it reaches the PDF engine.
"""
import copy
import io
import re
from collections import Counter
from dataclasses import asdict, dataclass, field, replace
from xml.sax.saxutils import escape

from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.platypus import HRFlowable, ListFlowable, ListItem, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.modules.resume import review
from app.modules.resume.skills import categorize, group_skills
from app.modules.resume.text import tidy
from app.shared import documents as doc_utils

CANONICAL = ("summary", "education", "experience", "projects", "skills", "coding", "leadership", "certifications")
DEFAULT_HEADINGS = {
    "summary": "Professional Summary", "education": "Education", "experience": "Experience",
    "projects": "Projects", "skills": "Skills", "coding": "Coding Profiles",
    "leadership": "Leadership / Achievements", "certifications": "Certifications",
}
_LEGACY_KEYS = {"achievements": "leadership"}
# Words that identify a section heading in an uploaded resume (matched on letters only, lower case).
_HEADING_WORDS = {
    "summary": ("summary", "professionalsummary", "profile", "objective", "careerobjective", "about", "aboutme"),
    "education": ("education", "academics", "academicbackground", "educationalqualifications", "academicqualifications"),
    "experience": ("experience", "workexperience", "professionalexperience", "internships", "internship", "employment", "workhistory"),
    "projects": ("projects", "personalprojects", "academicprojects", "keyprojects", "selectedprojects"),
    "skills": ("skills", "technicalskills", "technologies", "techstack", "coreskills", "skillsandtechnologies"),
    "coding": ("codingprofiles", "competitiveprogramming", "codingachievements", "codingprofile", "programmingprofiles"),
    "leadership": ("achievements", "awards", "honors", "honours", "accomplishments", "awardsandachievements", "extracurricular",
                   "positionsofresponsibility", "leadership", "leadershipachievements", "leadershipandachievements"),
    "certifications": ("certifications", "certificationsandcourses", "certificationscourses", "courses", "licensesandcertifications"),
}
_FAMILY_FONTS = {
    "serif": ("Times-Roman", "Times-Bold", "Times-Italic"),
    "sans": ("Helvetica", "Helvetica-Bold", "Helvetica-Oblique"),
    "mono": ("Courier", "Courier-Bold", "Courier-Oblique"),
}
_DATE = re.compile(r"((jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(19|20)\d{2}|present|current", re.I)
_MONTHS = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
_HEADER_LABELS = {"github", "linkedin", "portfolio", "website", "email", "e-mail", "phone", "mobile", "resume", "blog", "twitter", "x"}


@dataclass
class LayoutProfile:
    """Everything the renderer needs to know about a look. Templates 1 to 3 are fixed instances;
    template 4 is read from the user's file."""

    font_family: str = "sans"          # serif | sans | mono (mapped to a standard PDF font)
    name_size: float = 18
    heading_size: float = 11
    body_size: float = 10
    name_align: str = "left"           # left | center
    name_case: str = "as_is"           # as_is | upper
    header_style: str = "plain"        # plain | bar (colour band behind the name)
    heading_case: str = "title"        # title | upper
    heading_bold: bool = True
    heading_rule: bool = False
    heading_band: bool = False         # light tinted band behind each heading
    section_order: list[str] = field(default_factory=lambda: list(CANONICAL))
    omit: list[str] = field(default_factory=list)   # sections this look never shows (e.g. no summary)
    heading_words: dict[str, str] = field(default_factory=dict)
    bullet: str = "•"
    margin_mm: float = 18
    accent: str | None = None          # hex like "#1d4ed8"
    date_align: str = "right"          # right | inline
    tag_style: str = "paren"           # paren | mono (kept for template 4)
    tech_style: str = "inline"         # inline ("Title | A · B") | line ("Tech Stack: A, B" under the title)
    skills_bullets: bool = False       # "• Languages: ..." instead of plain lines
    show_headline: bool = False
    show_location: bool = True
    compact: bool = False

    def heading(self, key: str) -> str:
        text = self.heading_words.get(key) or DEFAULT_HEADINGS[key]
        return text.upper() if self.heading_case == "upper" else text


CLASSIC = LayoutProfile(
    font_family="serif", name_size=20, heading_size=11, body_size=10, name_align="center", name_case="upper",
    heading_case="upper", heading_rule=True,
    section_order=["summary", "education", "projects", "experience", "skills", "certifications", "coding", "leadership"],
    heading_words={"skills": "Technical Skills", "certifications": "Certifications & Courses"},
    margin_mm=14, date_align="right", tech_style="inline", show_location=True, compact=True,
)
INTERN = LayoutProfile(
    font_family="sans", name_size=21, heading_size=12, body_size=9.5, name_align="center", heading_case="title",
    heading_bold=False, heading_rule=True,
    section_order=["education", "skills", "projects", "experience", "coding", "leadership", "certifications"],
    omit=["summary"], margin_mm=13, accent="#2e1a6e", date_align="right", tech_style="line", skills_bullets=True,
    show_location=False, compact=True,
)
MODERN = LayoutProfile(
    font_family="sans", name_size=20, heading_size=11, body_size=9.5, name_align="left", header_style="bar",
    heading_case="upper", heading_band=True,
    section_order=["education", "skills", "projects", "experience", "coding", "leadership", "certifications"],
    omit=["summary"], margin_mm=13, accent="#4338ca", date_align="right", tech_style="line", skills_bullets=True,
    show_headline=True, show_location=True, compact=True,
)

TEMPLATES = [
    {"id": "classic", "number": 1, "name": "Classic Software Engineer",
     "description": "Professional summary first, then Education, Projects, Experience, sub-categorised Technical Skills and Certifications. Serif, ruled headings."},
    {"id": "intern", "number": 2, "name": "Tech Intern",
     "description": "No summary. Education, sub-categorised Skills, Projects with tech stack, Coding Profiles and Leadership. Clean sans with accent."},
    {"id": "modern", "number": 3, "name": "Modern Developer",
     "description": "Same order as Tech Intern with a modern look: accent header band and tinted section headings."},
    {"id": "clone", "number": 4, "name": "Matches your uploaded resume",
     "description": "Your own resume's fonts, header alignment and section order, filled with this version's content."},
]
PRESETS = {"classic": CLASSIC, "intern": INTERN, "modern": MODERN}


# ---------------------------------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------------------------------

def _esc(text: str | None) -> str:
    return escape(tidy(text))  # user text is never interpreted as markup, and PDF line-wraps never survive


def _attr(url: str) -> str:
    return escape(url, {'"': "&quot;"})


def _month_year(iso: str | None) -> str:
    if not iso:
        return ""
    m = re.match(r"(\d{4})-(\d{2})", iso)
    if not m:
        return iso[:7]
    year, month = m.group(1), int(m.group(2))
    return f"{_MONTHS[month - 1]} {year}" if 1 <= month <= 12 else year


def _dates(item: dict) -> str:
    return " – ".join(x for x in (_month_year(item.get("start_date")), _month_year(item.get("end_date"))) if x)


def _order(profile: LayoutProfile) -> list[str]:
    """Listed sections in the layout's order; sections it does not mention follow, so nothing is dropped
    (except those the look omits on purpose, such as the summary in the Tech Intern style)."""
    listed = [_LEGACY_KEYS.get(k, k) for k in profile.section_order]
    order = [k for k in dict.fromkeys(listed) if k in CANONICAL and k not in profile.omit]
    return order + [k for k in CANONICAL if k not in order and k not in profile.omit]


def _split_links(content: dict) -> tuple[list[dict], list[dict]]:
    """(header links, body links). A link goes into the text where its words appear (a project title, a coding
    profile line); contact-style links (GitHub, LinkedIn, e-mail, phone) and links whose words appear nowhere
    else go into the contact line under the name."""
    links = [link for link in content.get("links") or [] if link.get("url") and link.get("text")]
    body_text = " ".join(
        [p.get("title") or "" for p in content.get("projects") or []]
        + [b["text"] for s in ("projects", "experience") for e in content.get(s) or [] for b in e.get("bullets") or []]
        + [a.get("title") or "" for a in content.get("achievements") or []]
    )
    header, body = [], []
    for link in links:
        label = link["text"].strip().lower()
        if link["url"].lower().startswith(("mailto:", "tel:")) or label in _HEADER_LABELS or link["text"] not in body_text:
            header.append(link)
        else:
            body.append(link)
    return header, body


def _render_once(content: dict, profile: LayoutProfile) -> bytes:
    reg, bold, ital = _FAMILY_FONTS.get(profile.font_family, _FAMILY_FONTS["sans"])
    accent = colors.HexColor(profile.accent) if profile.accent else None
    ink = colors.HexColor("#111111")
    link_color = profile.accent or "#1d4ed8"
    body = profile.body_size
    lead = body * (1.22 if profile.compact else 1.32)
    gap = 1.6 if profile.compact else 3
    margin = profile.margin_mm * mm
    width = A4[0] - 2 * margin - 12  # the page frame keeps 6 pt of padding on each side

    st_body = ParagraphStyle("b", fontName=reg, fontSize=body, leading=lead, textColor=ink)
    st_date = ParagraphStyle("d", parent=st_body, alignment=TA_RIGHT)
    st_head = ParagraphStyle(
        "h", fontName=bold if profile.heading_bold else reg, fontSize=profile.heading_size,
        leading=profile.heading_size * 1.25, spaceBefore=gap * 3.2, spaceAfter=gap * 0.6,
        textColor=accent or colors.black,
    )
    align = TA_CENTER if profile.name_align == "center" else TA_LEFT
    st_name = ParagraphStyle("n", fontName=bold, fontSize=profile.name_size, leading=profile.name_size * 1.2,
                             alignment=align, textColor=accent or colors.black)
    st_contact = ParagraphStyle("c", parent=st_body, alignment=align, textColor=accent or ink)
    st_skill = ParagraphStyle("sk", parent=st_body, leftIndent=10 if profile.skills_bullets else 0,
                              bulletIndent=1, spaceAfter=0.6)

    header_links, body_links = _split_links(content)
    body_links.sort(key=lambda link: -len(link["text"]))

    def inline(text: str | None) -> str:
        """Escaped text with the user-approved hyperlinks placed on the words they belong to (first match)."""
        out = _esc(text)
        tokens: dict[str, str] = {}
        for i, link in enumerate(body_links):
            t = _esc(link["text"])
            pos = out.find(t) if len(t) >= 3 else -1
            if pos == -1:
                continue
            key = f"\x00{i}\x00"
            out = out[:pos] + key + out[pos + len(t):]
            tokens[key] = f'<a href="{_attr(link["url"])}" color="{link_color}">{t}</a>'
        for key, value in tokens.items():
            out = out.replace(key, value)
        return out

    h = content.get("header", {})
    story: list = []
    name = tidy(h.get("name")) or "Resume"
    shown_name = name.upper() if profile.name_case == "upper" else name

    contact: list[str] = []
    email = tidy(h.get("email"))
    mail_link = next((link for link in header_links if link["url"].lower().startswith("mailto:")), None)
    if email:
        href = mail_link["url"] if mail_link else f"mailto:{email}"
        contact.append(f'<a href="{_attr(href)}">{_esc(email)}</a>')
    for link in header_links:
        if link is mail_link:
            continue
        if link["url"].lower().startswith("tel:"):
            contact.append(f'<a href="{_attr(link["url"])}">{_esc(link["text"])}</a>')
        else:
            contact.append(f'<a href="{_attr(link["url"])}" color="{link_color}">{_esc(link["text"])}</a>')
    if profile.show_location and h.get("location"):
        contact.append(_esc(h.get("location")))
    contact_line = " | ".join(contact)
    headline = _esc(h.get("headline")) if profile.show_headline else ""

    if profile.header_style == "bar":
        band = accent or colors.HexColor("#4338ca")
        st_bar_name = ParagraphStyle("bn", parent=st_name, textColor=colors.white)
        st_bar_sub = ParagraphStyle("bs", parent=st_contact, textColor=colors.white)
        white_contact = re.sub(r' color="[^"]*"', "", contact_line).replace("<a ", '<a color="#ffffff" ')
        cells = [[Paragraph(_esc(shown_name), st_bar_name)]]
        if headline:
            cells.append([Paragraph(headline, st_bar_sub)])
        if white_contact:
            cells.append([Paragraph(white_contact, st_bar_sub)])
        bar = Table(cells, colWidths=[width], hAlign="LEFT")
        bar.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), band),
            ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 1.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5),
            ("TOPPADDING", (0, 0), (-1, 0), 8), ("BOTTOMPADDING", (0, -1), (-1, -1), 8),
        ]))
        story.append(bar)
    else:
        story.append(Paragraph(_esc(shown_name), st_name))
        if headline:
            story.append(Paragraph(headline, st_contact))
        if contact_line:
            story.append(Paragraph(contact_line, st_contact))

    def head(key: str) -> list:
        title = _esc(profile.heading(key))
        if profile.heading_band:
            tint = colors.Color(*(accent or colors.HexColor("#4338ca")).rgb(), alpha=0.12)
            t = Table([[Paragraph(title, ParagraphStyle("hb", parent=st_head, spaceBefore=0, spaceAfter=0))]],
                      colWidths=[width], hAlign="LEFT")
            t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), tint),
                                   ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                                   ("TOPPADDING", (0, 0), (-1, -1), 1.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5)]))
            return [Spacer(1, gap * 3), t, Spacer(1, gap)]
        out: list = [Paragraph(title, st_head)]
        if profile.heading_rule:
            out.append(HRFlowable(width="100%", thickness=0.7, color=accent or colors.black, spaceBefore=0.5, spaceAfter=gap * 1.4))
        return out

    def row(left: str, right: str, right_bold: bool = False) -> list:
        """Left text with right-aligned dates. The date column is sized to the date itself, and the left
        column wraps inside the remaining width, so the two can never overlap."""
        if right and profile.date_align == "right":
            font = bold if right_bold else reg
            dw = min(max(stringWidth(tidy(right), font, body) + 6, 18 * mm), 62 * mm)
            rtext = f"<b>{_esc(right)}</b>" if right_bold else _esc(right)
            t = Table([[Paragraph(left, st_body), Paragraph(rtext, st_date)]], colWidths=[width - dw, dw], hAlign="LEFT")
            t.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                                   ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                                   ("VALIGN", (0, 0), (-1, -1), "TOP")]))
            return [t]
        return [Paragraph(left + (f" | {_esc(right)}" if right else ""), st_body)]

    def bullets(items: list[dict]) -> list:
        items = [b for b in items if tidy(b.get("text"))]
        if not items:
            return []
        return [ListFlowable(
            [ListItem(Paragraph(inline(b["text"]), st_body), leftIndent=11, value=profile.bullet) for b in items],
            bulletType="bullet", start=profile.bullet, leftIndent=11, bulletFontName=reg, bulletFontSize=body * 0.9,
            bulletOffsetY=0, spaceBefore=0.5,
        )]

    def achievement_lines(kind: str) -> list:
        lines = []
        for a in content.get("achievements") or []:
            if review.achievement_kind(a) != kind:
                continue
            title, issuer = tidy(a.get("title")), tidy(a.get("issuer"))
            if kind == "certifications" or kind == "certification":
                text = f"<b>{_esc(issuer)}:</b> {inline(title)}" if issuer and issuer.lower() not in title.lower() else inline(title)
            else:
                text = inline(title) + (f" – {_esc(issuer)}" if issuer and issuer.lower() not in title.lower() else "")
            lines.append({"text": title, "_markup": text})
        if not lines:
            return []
        return [ListFlowable(
            [ListItem(Paragraph(x["_markup"], st_body), leftIndent=11, value=profile.bullet) for x in lines],
            bulletType="bullet", start=profile.bullet, leftIndent=11, bulletFontName=reg, bulletFontSize=body * 0.9,
        )]

    def section(key: str) -> list:
        out: list = []
        if key == "summary":
            text = (content.get("summary") or {}).get("text")
            if text and tidy(text):
                out = head(key) + [Paragraph(inline(text), st_body)]
        elif key == "education" and content.get("education"):
            out = head(key)
            for e in content["education"]:
                out += row(f"<b>{_esc(e['institution'])}</b>", _dates(e))
                detail = ", ".join(tidy(x) for x in (e.get("degree"), e.get("field")) if tidy(x))
                grade = tidy(e.get("grade"))
                if detail or grade:
                    left = f'<font color="{profile.accent}">{_esc(detail)}</font>' if profile.accent and detail else _esc(detail)
                    out += row(left or "&nbsp;", grade, right_bold=True) if grade else [Paragraph(left, st_body)]
                out.append(Spacer(1, gap * 1.2))
        elif key == "experience" and content.get("experience"):
            out = head(key)
            for e in content["experience"]:
                org = tidy(e.get("organization"))
                label = f"<b>{inline(e['title'])}</b>" + (f" | <i>{_esc(org)}</i>" if org else "")
                out += row(label, _dates(e)) + bullets(e.get("bullets", [])) + [Spacer(1, gap)]
        elif key == "projects" and content.get("projects"):
            out = head(key)
            for p in content["projects"]:
                tech = [tidy(t) for t in p.get("tech") or [] if tidy(t)]
                title = inline(p["title"])
                title = f'<font color="{profile.accent}"><b>{title}</b></font>' if profile.accent else f"<b>{title}</b>"
                if profile.tech_style == "line":
                    out += row(title, _dates(p))
                    if tech:
                        out.append(Paragraph(f"<b>Tech Stack:</b> {_esc(', '.join(tech))}", st_body))
                else:
                    stack = f' | <i>{_esc(" · ".join(tech))}</i>' if tech else ""
                    if profile.tag_style == "mono" and tech:
                        stack = f' <font name="Courier" size="{body - 1}">[{_esc(", ".join(tech))}]</font>'
                    out += row(title + stack, _dates(p))
                out += bullets(p.get("bullets", [])) + [Spacer(1, gap)]
        elif key == "skills" and content.get("skills"):
            out = head(key)
            meta = content.get("skill_meta") or {}
            cats = {n: (meta.get(n) or {}).get("category") or categorize(n) for n in content["skills"]}
            for g in group_skills(content["skills"], cats):
                line = f"<b>{_esc(g['category'])}:</b> {_esc(', '.join(tidy(x) for x in g['items']))}"
                out.append(Paragraph(line, st_skill, bulletText=profile.bullet if profile.skills_bullets else None))
        elif key in ("coding", "leadership", "certifications"):
            kind = "certification" if key == "certifications" else key
            lines = achievement_lines(kind)
            if lines:
                out = head(key) + lines
        return out

    for key in _order(profile):
        story += section(key)

    buf = io.BytesIO()
    SimpleDocTemplate(
        buf, pagesize=A4, leftMargin=margin, rightMargin=margin, topMargin=margin * 0.85, bottomMargin=margin * 0.85,
        title=name, invariant=1,
    ).build(story)
    return buf.getvalue()


# ---------------------------------------------------------------------------------------------------
# One page, always
# ---------------------------------------------------------------------------------------------------

MIN_BODY_PT = 8.0      # nothing is shrunk below this: smaller than 8 pt stops being readable (and ATS-safe)
MIN_MARGIN_MM = 10.0


@dataclass
class FitReport:
    pages: int
    scale: float
    trimmed: list[str]   # what had to be left out of the PDF (never from the saved resume version)

    def as_dict(self) -> dict:
        return asdict(self)


def _scaled(profile: LayoutProfile, scale: float) -> LayoutProfile:
    if scale >= 1.0:
        return profile
    return replace(
        profile, name_size=profile.name_size * scale, heading_size=profile.heading_size * scale,
        body_size=max(MIN_BODY_PT, profile.body_size * scale),
        margin_mm=max(MIN_MARGIN_MM, profile.margin_mm * (0.5 + 0.5 * scale)), compact=True,
    )


def _page_count(data: bytes) -> int:
    return len(PdfReader(io.BytesIO(data)).pages)


def _capped(content: dict, cap: int) -> dict:
    out = copy.deepcopy(content)
    for key in ("experience", "projects"):
        for item in out.get(key) or []:
            item["bullets"] = (item.get("bullets") or [])[:cap]
    return out


def render_resume_fit(content: dict, profile: LayoutProfile, *, final: bool = False) -> tuple[bytes, FitReport]:
    """Renders on exactly ONE page whenever that is possible, and says what it had to do.

    `final=True` (the exported PDF) renders only approved and job-description-locked items; the live preview
    also shows items still waiting in the approval checklist. Rejected items never render.

    In order: 1. the normal size; 2. smaller type and margins, never below 8 pt; 3. fewer bullets per entry
    (4, 3, 2, 1); 4. drop certifications, then the other achievements, then keep only the first three projects
    and jobs. Steps 3 and 4 only change the PDF, never the saved version, and are listed in the report."""
    content = review.renderable(content, final=final)
    s_min = min(1.0, MIN_BODY_PT / profile.body_size)
    steps = [1.0] + [round(1 - (1 - s_min) * i / 6, 3) for i in range(1, 7)] if s_min < 1.0 else [1.0]
    for scale in steps:
        data = _render_once(content, _scaled(profile, scale))
        if _page_count(data) == 1:
            return data, FitReport(1, scale, [])
    small = _scaled(profile, steps[-1])
    for cap in (4, 3, 2, 1):
        data = _render_once(_capped(content, cap), small)
        if _page_count(data) == 1:
            return data, FitReport(1, steps[-1], [f"bullets limited to {cap} per entry"])
    slim = _capped(content, 1)
    notes = ["bullets limited to 1 per entry"]
    for label, change in (
        ("certifications left out", lambda c: c.update(
            achievements=[a for a in c.get("achievements") or [] if review.achievement_kind(a) != "certification"])),
        ("achievements left out", lambda c: c.update(achievements=[])),
        ("only the first 3 projects and jobs kept", lambda c: c.update(
            projects=(c.get("projects") or [])[:3], experience=(c.get("experience") or [])[:3])),
    ):
        change(slim)
        notes.append(label)
        data = _render_once(slim, small)
        if _page_count(data) == 1:
            return data, FitReport(1, steps[-1], notes)
    return data, FitReport(_page_count(data), steps[-1], notes)  # absurdly long input: best effort, reported honestly


def render_resume(content: dict, profile: LayoutProfile, *, final: bool = False) -> bytes:
    return render_resume_fit(content, profile, final=final)[0]


# ---------------------------------------------------------------------------------------------------
# Template 4: reading the layout of the uploaded resume
# ---------------------------------------------------------------------------------------------------

@dataclass
class CloneAnalysis:
    profile: LayoutProfile
    matched: list[str]


def _letters(text: str) -> str:
    return re.sub(r"[^a-z]", "", text.lower())


def _heading_key(text: str) -> str | None:
    if len(text.strip()) > 45:
        return None
    flat = _letters(text)
    for key, words in _HEADING_WORDS.items():
        if flat in words:
            return key
    return None


def _family_of(font_name: str) -> str:
    n = re.sub(r"^[A-Z]{6}\+", "", font_name or "").lower()
    if any(w in n for w in ("courier", "mono", "consolas", "typewriter", "cmtt", "menlo", "lucidaconsole")):
        return "mono"
    if any(w in n for w in ("times", "serif", "georgia", "garamond", "cambria", "palatino", "book", "cmr", "cmbx",
                            "minion", "roman", "charter", "lmroman", "libertin", "baskerville")) and "sans" not in n:
        return "serif"
    return "sans"


def _is_bold(font_name: str) -> bool:
    n = re.sub(r"^[A-Z]{6}\+", "", font_name or "").lower()
    return any(w in n for w in ("bold", "black", "heavy", "semibold", "demi", "cmbx", "-bd"))


def _hex(rgb: tuple[float, float, float]) -> str:
    return "#" + "".join(f"{max(0, min(255, round(c * 255))):02x}" for c in rgb)


def _is_colourful(rgb: tuple[float, float, float]) -> bool:
    return max(rgb) - min(rgb) > 0.2  # not black, white or grey


@dataclass
class _Run:
    text: str
    x: float
    y: float
    size: float
    font: str
    fill: tuple[float, float, float]


def _pdf_runs(data: bytes) -> tuple[list[_Run], float, list[tuple[float, float, float]]]:
    """Text runs of page 1 with position, size, font and fill colour, plus the page width and the
    horizontal rules (x, y, length) drawn on it."""
    reader = PdfReader(io.BytesIO(data))
    if reader.is_encrypted or not reader.pages:
        return [], 595.0, []
    page = reader.pages[0]
    width = float(page.mediabox.width)
    runs: list[_Run] = []
    rules: list[tuple[float, float, float]] = []
    state = {"fill": (0.0, 0.0, 0.0), "path": None}

    def before(op, args, cm, tm):  # noqa: ANN001
        try:
            if op == b"rg" and len(args) == 3:
                state["fill"] = tuple(float(a) for a in args)  # type: ignore[assignment]
            elif op == b"g" and len(args) == 1:
                v = float(args[0])
                state["fill"] = (v, v, v)
            elif op == b"re" and len(args) == 4:
                x, y, w, h = (float(a) for a in args)
                if abs(h) < 2.5 and w > width * 0.3:
                    rules.append((x, y, w))
            elif op == b"m" and len(args) == 2:
                state["path"] = (float(args[0]), float(args[1]))
            elif op == b"l" and len(args) == 2 and state["path"]:
                (x0, y0), (x1, y1) = state["path"], (float(args[0]), float(args[1]))
                if abs(y1 - y0) < 1 and abs(x1 - x0) > width * 0.3:
                    rules.append((min(x0, x1), y0, abs(x1 - x0)))
        except (TypeError, ValueError):
            pass

    def visit(text, cm, tm, font_dict, font_size):  # noqa: ANN001
        if not text or not text.strip():
            return
        try:
            scale = abs(float(tm[3])) or 1.0
            size = float(font_size or 0) * scale
            font = str((font_dict or {}).get("/BaseFont", "")).lstrip("/")
            runs.append(_Run(text, float(tm[4]), float(tm[5]), round(size, 1), font, state["fill"]))  # type: ignore[arg-type]
        except (TypeError, ValueError, IndexError):
            pass

    page.extract_text(visitor_text=visit, visitor_operand_before=before)
    return runs, width, rules


def _summarise(profile: LayoutProfile, found: list[tuple[str, str]], extras: dict) -> list[str]:
    fam = {"serif": "serif", "sans": "sans-serif", "mono": "monospace"}[profile.font_family]
    out = [f"{fam} font ({extras.get('font_name') or 'standard'})", f"{'centered' if profile.name_align == 'center' else 'left-aligned'} header",
           f"body {profile.body_size:g} pt, name {profile.name_size:g} pt"]
    if found:
        out.append("sections: " + ", ".join(w for _, w in found))
    out.append("headings in capitals" if profile.heading_case == "upper" else "headings in title case")
    if profile.heading_rule:
        out.append("ruled section headings")
    out.append("dates on the right" if profile.date_align == "right" else "dates inline")
    if profile.accent:
        out.append(f"accent colour {profile.accent}")
    return out


def _analyze_pdf(data: bytes) -> CloneAnalysis | None:
    runs, page_w, rules = _pdf_runs(data)
    if len(runs) < 8:
        return None
    # group runs into lines by baseline
    lines: dict[int, list[_Run]] = {}
    for r in runs:
        lines.setdefault(round(r.y), []).append(r)
    ordered = [sorted(v, key=lambda r: r.x) for _, v in sorted(lines.items(), key=lambda kv: -kv[0])]

    weights: Counter = Counter()
    fonts: Counter = Counter()
    for r in runs:
        weights[r.size] += len(r.text)
        fonts[r.font] += len(r.text)
    body_size = weights.most_common(1)[0][0]
    body_font = fonts.most_common(1)[0][0]
    family = _family_of(body_font)

    found: list[tuple[str, str]] = []
    heading_runs: list[_Run] = []
    for ln in ordered:
        text = "".join(r.text for r in ln).strip()
        key = _heading_key(text)
        if key and all(k != key for k, _ in found):
            found.append((key, text.title() if text.isupper() else text))
            heading_runs.append(ln[0])
    if not found:
        return None

    # name = the biggest text near the top
    top = max(runs, key=lambda r: (r.size, r.y))
    name_line = [r for r in lines[round(top.y)]]
    est_w = sum(len(r.text) for r in name_line) * top.size * 0.5
    left_x = min(r.x for r in name_line)
    centred = abs((left_x + est_w / 2) - page_w / 2) < page_w * 0.1 and left_x > page_w * 0.15
    margin_pt = min(r.x for r in runs)

    heading_size = round(sum(r.size for r in heading_runs) / len(heading_runs), 1)
    raw_headings = ["".join(r.text for r in ln).strip() for ln in ordered]
    raw_headings = [t for t in raw_headings if _heading_key(t)]
    upper = bool(raw_headings) and all(t.isupper() for t in raw_headings)
    heading_bold = sum(_is_bold(r.font) for r in heading_runs) >= len(heading_runs) / 2
    heading_ys = [r.y for r in heading_runs]
    rule = any(abs(y - hy) < 14 for _, y, _ in rules for hy in heading_ys) if rules else False

    glyphs = Counter(ln[0].text.strip()[:1] for ln in ordered if ln[0].text.strip()[:1] in "•●▪‣◦-–*·")
    bullet = "•"
    if glyphs:
        g = glyphs.most_common(1)[0][0]
        bullet = g if g in "-–*" else "•"

    accents = Counter(_hex(r.fill) for r in heading_runs + [top] if _is_colourful(r.fill))
    accent = accents.most_common(1)[0][0] if accents else None

    right_dates = any(_DATE.fullmatch(r.text.strip()) or _DATE.search(r.text) for ln in ordered for r in ln[-1:]
                      if r.x > page_w * 0.6 and len(ln) > 1)

    profile = LayoutProfile(
        font_family=family, name_size=min(max(top.size, 14), 30), heading_size=min(max(heading_size, body_size), 16),
        body_size=min(max(body_size, 8.5), 12), name_align="center" if centred else "left", heading_case="upper" if upper else "title",
        heading_bold=heading_bold, heading_rule=rule, section_order=[k for k, _ in found],
        heading_words={k: w for k, w in found}, bullet=bullet, margin_mm=min(max(margin_pt / 2.835, 10), 25),
        accent=accent, date_align="right" if right_dates else "inline", compact=body_size <= 10,
    )
    return CloneAnalysis(profile, _summarise(profile, found, {"font_name": re.sub(r"^[A-Z]{6}\+", "", body_font).lstrip("/")}))


def _analyze_docx(data: bytes) -> CloneAnalysis | None:
    import docx
    from docx.enum.text import WD_ALIGN_PARAGRAPH

    d = docx.Document(io.BytesIO(data))
    paras = [p for p in d.paragraphs if p.text.strip()]
    if len(paras) < 5:
        return None

    def run_font(p) -> tuple[str, float | None, bool, str | None]:  # noqa: ANN001
        for r in p.runs:
            if r.text.strip():
                name = r.font.name or p.style.font.name or d.styles["Normal"].font.name or ""
                size = (r.font.size or p.style.font.size or d.styles["Normal"].font.size)
                rgb = None
                try:
                    if r.font.color is not None and r.font.color.rgb is not None:
                        rgb = "#" + str(r.font.color.rgb).lower()
                except (AttributeError, ValueError):
                    rgb = None
                return name, (size.pt if size else None), bool(r.font.bold), rgb
        return "", None, False, None

    sizes: Counter = Counter()
    fonts: Counter = Counter()
    for p in paras:
        name, size, _, _ = run_font(p)
        if size:
            sizes[round(size, 1)] += len(p.text)
        if name:
            fonts[name] += len(p.text)
    body_size = sizes.most_common(1)[0][0] if sizes else 10.0
    font_name = fonts.most_common(1)[0][0] if fonts else ""
    found: list[tuple[str, str]] = []
    heading_meta: list[tuple[float | None, bool, str | None, str]] = []
    for p in paras:
        key = _heading_key(p.text)
        if key and all(k != key for k, _ in found):
            _, hs, hb, hc = run_font(p)
            found.append((key, p.text.strip().title() if p.text.strip().isupper() else p.text.strip()))
            heading_meta.append((hs, hb, hc, p.text.strip()))
    if not found:
        return None
    first = paras[0]
    _, name_size, _, _ = run_font(first)
    centred = first.alignment == WD_ALIGN_PARAGRAPH.CENTER
    upper = all(t.isupper() for *_, t in heading_meta)
    accents = Counter(c for _, _, c, _ in heading_meta if c and c not in ("#000000", "#auto"))
    bullets = sum(1 for p in paras if p.style.name.lower().startswith("list") or p.text.strip()[:1] in "•●▪-–*")
    right_tab = any("\t" in p.text for p in paras)
    sec = d.sections[0]
    margin_mm = (sec.left_margin.mm if sec.left_margin else 18)
    profile = LayoutProfile(
        font_family=_family_of(font_name), name_size=min(max(name_size or 18, 14), 30),
        heading_size=min(max((heading_meta[0][0] or body_size + 1), body_size), 16), body_size=min(max(body_size, 8.5), 12),
        name_align="center" if centred else "left", heading_case="upper" if upper else "title",
        heading_bold=sum(1 for _, b, _, _ in heading_meta if b) >= len(heading_meta) / 2, heading_rule=False,
        section_order=[k for k, _ in found], heading_words={k: w for k, w in found}, bullet="•" if bullets else "•",
        margin_mm=min(max(margin_mm, 10), 25), accent=accents.most_common(1)[0][0] if accents else None,
        date_align="right" if right_tab else "inline", compact=body_size <= 10,
    )
    return CloneAnalysis(profile, _summarise(profile, found, {"font_name": font_name or None}))


def analyze_layout(data: bytes, mime: str) -> CloneAnalysis | None:
    """Reads fonts, sizes, header alignment, section order and wording from an uploaded resume.
    Returns None when the file cannot be read reliably (scans, odd structure): the caller then says
    template 4 is unavailable instead of guessing."""
    try:
        if mime == doc_utils.PDF:
            return _analyze_pdf(data)
        if mime == doc_utils.DOCX:
            return _analyze_docx(data)
    except Exception:  # a damaged file must not break the picker
        return None
    return None


def profile_to_dict(p: LayoutProfile) -> dict:
    return asdict(p)
