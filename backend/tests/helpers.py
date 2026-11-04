import io

from docx import Document
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

RESUME_TEXT = """Asha Verma
asha@example.com

Education
Graphic Era University
B.Tech Computer Science

Experience
Backend Intern - Acme Corp
- Built REST APIs with FastAPI and PostgreSQL
- Wrote unit tests with pytest

Projects
Placement Tracker
- Web app using Python and React for tracking applications

Skills
Python, FastAPI, SQL, Git

Achievements
Winner, Smart India Hackathon internal round
"""


def make_pdf(text: str = RESUME_TEXT) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4, invariant=1)
    y = 800
    for line in text.splitlines():
        c.drawString(40, y, line)
        y -= 16
    c.save()
    return buf.getvalue()


def make_docx(text: str = RESUME_TEXT) -> bytes:
    doc = Document()
    for line in text.splitlines():
        doc.add_paragraph(line)
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def upload(client, data: bytes, name: str = "resume.pdf", mime: str = "application/pdf"):
    return client.http.post("/api/v1/resume/documents", files={"file": (name, data, mime)})
