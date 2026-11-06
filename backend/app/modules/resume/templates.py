"""Resume templates: four looks rendered from the SAME approved content.

1 classic - Overleaf/LaTeX-style Software Engineer (serif, ruled headings, right-aligned dates)
2 intern  - Tech-focused Software Intern (sans, skills and projects first, monospace tech tags)
3 modern  - Modern startup Developer (sans, accent header bar, projects before experience)
4 clone   - A close match to the user's uploaded resume, built from a LayoutProfile that
            `analyze_layout` reads from that file.

Only the look changes between templates. The words always come from the version's content, so the
honesty rules that apply to the content apply to every template. Text is escaped before it reaches
the PDF engine, and all fonts are standard PDF fonts, so the output is real, selectable, ATS-readable text.
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
from reportlab.platypus import HRFlowable, ListFlowable, ListItem, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.shared import documents as doc_utils

CANONICAL = ("summary", "education", "experience", "projects", "skills", "achievements")
DEFAULT_HEADINGS = {
    "summary": "Summary", "education": "Education", "experience": "Experience",
    "projects": "Projects", "skills": "Skills", "achievements": "Achievements",
}
# Words that identify a section heading in an uploaded resume (matched on letters only, lower case).
_HEADING_WORDS = {
    "summary": ("summary", "professionalsummary", "profile", "objective", "careerobjective", "about", "aboutme"),
    "education": ("education", "academics", "academicbackground", "educationalqualifications", "academicqualifications"),
    "experience": ("experience", "workexperience", "professionalexperience", "internships", "internship", "employment", "workhistory"),
    "projects": ("projects", "personalprojects", "academicprojects", "keyprojects", "selectedprojects"),
    "skills": ("skills", "technicalskills", "technologies", "techstack", "coreskills", "skillsandtechnologies"),
    "achievements": ("achievements", "awards", "honors", "honours", "certifications", "accomplishments", "awardsandachievements", "extracurricular", "positionsofresponsibility"),
}
_FAMILY_FONTS = {
    "serif": ("Times-Roman", "Times-Bold", "Times-Italic"),
    "sans": ("Helvetica", "Helvetica-Bold", "Helvetica-Oblique"),
    "mono": ("Courier", "Courier-Bold", "Courier-Oblique"),
}
_DATE = re.compile(r"((jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(19|20)\d{2}|present|current", re.I)


@dataclass
class LayoutProfile:
    """Everything the renderer needs to know about a look. Templates 1 to 3 are fixed instances;
    template 4 is read from the user's file."""

    font_family: str = "sans"          # serif | sans | mono (mapped to a standard PDF font)
    name_size: float = 18
    heading_size: float = 11
    body_size: float = 10
    name_align: str = "left"           # left | center
    header_style: str = "plain"        # plain | bar (colour band behind the name)
    heading_case: str = "title"        # title | upper
    heading_bold: bool = True
    heading_rule: bool = False
    section_order: list[str] = field(default_factory=lambda: list(CANONICAL))
    heading_words: dict[str, str] = field(default_factory=dict)
    bullet: str = "•"
    margin_mm: float = 18
    accent: str | None = None          # hex like "#1d4ed8"
    date_align: str = "right"          # right | inline
    tag_style: str = "paren"           # paren | mono
    compact: bool = False

    def heading(self, key: str) -> str:
        text = self.heading_words.get(key) or DEFAULT_HEADINGS[key]
        return text.upper() if self.heading_case == "upper" else text


CLASSIC = LayoutProfile(
    font_family="serif", name_size=22, heading_size=11, body_size=10, name_align="center", heading_case="upper",
    heading_rule=True, section_order=["summary", "education", "experience", "projects", "skills", "achievements"],
    margin_mm=15, date_align="right", compact=True,
)
INTERN = LayoutProfile(
    font_family="sans", name_size=20, heading_size=10.5, body_size=9.5, name_align="left", heading_case="upper",
    heading_rule=True, section_order=["summary", "skills", "projects", "experience", "education", "achievements"],
    margin_mm=15, accent="#0f766e", date_align="right", tag_style="mono", compact=True,
)
MODERN = LayoutProfile(
    font_family="sans", name_size=22, heading_size=12, body_size=10, name_align="left", header_style="bar",
    heading_case="title", heading_rule=False, section_order=["summary", "projects", "experience", "skills", "education", "achievements"],
    margin_mm=16, accent="#4f46e5", date_align="right", tag_style="paren",
)

TEMPLATES = [
    {"id": "classic", "number": 1, "name": "Classic Software Engineer",
     "description": "Overleaf/LaTeX style: serif type, ruled section headings, dates on the right."},
    {"id": "intern", "number": 2, "name": "Tech Intern",
     "description": "Compact and skills-first, with projects before experience and monospace tech tags."},
    {"id": "modern", "number": 3, "name": "Modern Developer",
     "description": "Clean modern sans with an accent header band and projects up front."},
    {"id": "clone", "number": 4, "name": "Matches your uploaded resume",
     "description": "Your own resume's fonts, header alignment and section order, filled with this version's content."},
]
PRESETS = {"classic": CLASSIC, "intern": INTERN, "modern": MODERN}


# ---------------------------------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------------------------------

def _esc(text: str | None) -> str:
    return escape(text or "")  # user text is never interpreted as markup


def _dates(item: dict) -> str:
    return " - ".join(x[:7] for x in (item.get("start_date"), item.get("end_date")) if x)


def _render_once(content: dict, profile: LayoutProfile) -> bytes:
    reg, bold, ital = _FAMILY_FONTS.get(profile.font_family, _FAMILY_FONTS["sans"])
    accent = colors.HexColor(profile.accent) if profile.accent else None
    body = profile.body_size
    lead = body * (1.2 if profile.compact else 1.3)
    gap = 2 if profile.compact else 4
    margin = profile.margin_mm * mm
    width = A4[0] - 2 * margin - 12  # the page frame keeps 6 pt of padding on each side

    st_body = ParagraphStyle("b", fontName=reg, fontSize=body, leading=lead)
    st_bold = ParagraphStyle("bb", parent=st_body, fontName=bold)
    st_date = ParagraphStyle("d", parent=st_body, alignment=TA_RIGHT)
    st_head = ParagraphStyle(
        "h", fontName=bold if profile.heading_bold else reg, fontSize=profile.heading_size, leading=profile.heading_size + 4,
        spaceBefore=gap * 3, spaceAfter=gap, textColor=accent or colors.black,
    )
    align = TA_CENTER if profile.name_align == "center" else TA_LEFT
    st_name = ParagraphStyle("n", fontName=bold, fontSize=profile.name_size, leading=profile.name_size + 4, alignment=align)
    st_contact = ParagraphStyle("c", parent=st_body, alignment=align)

    h = content.get("header", {})
    story: list = []
    name = h.get("name") or "Resume"
    contact = " | ".join(x for x in (h.get("headline"), h.get("email"), h.get("location")) if x)
    if profile.header_style == "bar":
        st_bar_name = ParagraphStyle("bn", parent=st_name, textColor=colors.white)
        st_bar_sub = ParagraphStyle("bs", parent=st_contact, textColor=colors.white)
        cells = [[Paragraph(_esc(name), st_bar_name)]] + ([[Paragraph(_esc(contact), st_bar_sub)]] if contact else [])
        bar = Table(cells, colWidths=[width], hAlign="LEFT")
        bar.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), accent or colors.HexColor("#4f46e5")),
            ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, 0), 10), ("BOTTOMPADDING", (0, -1), (-1, -1), 10),
        ]))
        story.append(bar)
    else:
        story.append(Paragraph(_esc(name), st_name))
        if contact:
            story.append(Paragraph(_esc(contact), st_contact))

    def head(key: str) -> list:
        out: list = [Paragraph(_esc(profile.heading(key)), st_head)]
        if profile.heading_rule:
            out.append(HRFlowable(width="100%", thickness=0.6, color=accent or colors.black, spaceAfter=gap))
        return out

    def row(left: str, right: str) -> list:
        """A title line with its date: dates right-aligned in a borderless row, or inline after a separator."""
        if right and profile.date_align == "right":
            t = Table([[Paragraph(left, st_body), Paragraph(_esc(right), st_date)]], colWidths=[width - 38 * mm, 38 * mm], hAlign="LEFT")
            t.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                                   ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0)]))
            return [t]
        return [Paragraph(left + (f" | {_esc(right)}" if right else ""), st_body)]

    def bullets(items: list[dict]) -> list:
        if not items:
            return []
        return [ListFlowable(
            [ListItem(Paragraph(_esc(b["text"]), st_body), leftIndent=12) for b in items],
            bulletType="bullet", start=profile.bullet, leftIndent=12, bulletFontName=reg, bulletFontSize=body,
        )]

    def tags(tech: list[str]) -> str:
        if not tech:
            return ""
        if profile.tag_style == "mono":
            return f' <font name="Courier" size="{body - 1}">[{_esc(", ".join(tech))}]</font>'
        return f" <i>({_esc(', '.join(tech))})</i>"

    def section(key: str) -> list:
        out: list = []
        if key == "summary":
            text = (content.get("summary") or {}).get("text")
            if text:
                out = head(key) + [Paragraph(_esc(text), st_body)]
        elif key == "education" and content.get("education"):
            out = head(key)
            for e in content["education"]:
                detail = ", ".join(x for x in (e.get("degree"), e.get("field")) if x)
                out += row(f"<b>{_esc(e['institution'])}</b>", _dates(e))
                tail = " - ".join(x for x in (detail, e.get("grade")) if x)
                if tail:
                    out.append(Paragraph(f"<i>{_esc(tail)}</i>", st_body))
                out.append(Spacer(1, gap))
        elif key == "experience" and content.get("experience"):
            out = head(key)
            for e in content["experience"]:
                label = f"<b>{_esc(e['title'])}</b>" + (f", {_esc(e['organization'])}" if e.get("organization") else "")
                out += row(label, _dates(e)) + bullets(e.get("bullets", [])) + [Spacer(1, gap)]
        elif key == "projects" and content.get("projects"):
            out = head(key)
            for p in content["projects"]:
                title = f"<b>{_esc(p['title'])}</b>" + tags(p.get("tech") or [])
                out += [Paragraph(title, st_body)] + bullets(p.get("bullets", [])) + [Spacer(1, gap)]
        elif key == "skills" and content.get("skills"):
            line = ", ".join(content["skills"])
            style = ParagraphStyle("sk", parent=st_body, fontName="Courier", fontSize=body - 0.5) if profile.tag_style == "mono" else st_body
            out = head(key) + [Paragraph(_esc(line), style)]
        elif key == "achievements" and content.get("achievements"):
            out = head(key)
            for a in content["achievements"]:
                out.append(Paragraph(_esc(" - ".join(x for x in (a["title"], a.get("issuer")) if x)), st_body))
        return out

    # Sections the layout does not mention are still included, at the end: nothing in the resume is dropped.
    order = [k for k in profile.section_order if k in CANONICAL]
    order += [k for k in CANONICAL if k not in order]
    for key in order:
        story += section(key)

    buf = io.BytesIO()
    SimpleDocTemplate(
        buf, pagesize=A4, leftMargin=margin, rightMargin=margin, topMargin=margin * 0.9, bottomMargin=margin * 0.9,
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


def render_resume_fit(content: dict, profile: LayoutProfile) -> tuple[bytes, FitReport]:
    """Renders on exactly ONE page whenever that is possible, and says what it had to do.

    In order: 1. the normal size; 2. smaller type and margins, never below 8 pt; 3. fewer bullets per entry
    (4, 3, 2, 1); 4. drop achievements, then keep only the first three projects and jobs. Steps 3 and 4 only
    change the PDF, never the saved version, and are listed in the report so the user is told."""
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


def render_resume(content: dict, profile: LayoutProfile) -> bytes:
    return render_resume_fit(content, profile)[0]


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
