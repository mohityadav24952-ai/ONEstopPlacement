"""Upload validation and deterministic text extraction (no AI)."""
import io
import re
import zipfile

from pypdf import PdfReader
from pypdf.errors import PdfReadError

from app.core.errors import AppError

MAX_TEXT_CHARS = 30_000
MIN_TEXT_CHARS = 150  # below this the file is probably a scan or empty
PDF = "application/pdf"
DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def detect_type(filename: str, data: bytes) -> str:
    """Trust magic bytes, not the extension or client-declared type."""
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    if data.startswith(b"%PDF-") and ext == "pdf":
        return PDF
    if data.startswith(b"PK\x03\x04") and ext == "docx":
        try:
            names = zipfile.ZipFile(io.BytesIO(data)).namelist()
        except zipfile.BadZipFile:
            raise AppError("UNSUPPORTED_MEDIA_TYPE", "That file is damaged.", 415) from None
        if "word/document.xml" not in names:
            raise AppError("UNSUPPORTED_MEDIA_TYPE", "That is not a Word document.", 415)
        if any(n.lower().endswith("vbaproject.bin") for n in names):
            raise AppError("UNSUPPORTED_MEDIA_TYPE", "Files with macros are not accepted.", 415)
        return DOCX
    raise AppError("UNSUPPORTED_MEDIA_TYPE", "Upload a PDF or DOCX file.", 415)


def clean_text(text: str) -> str:
    text = text.replace("\x00", "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_text(mime: str, data: bytes) -> tuple[str, int | None]:
    try:
        if mime == PDF:
            reader = PdfReader(io.BytesIO(data))
            if reader.is_encrypted:
                raise AppError("FILE_ENCRYPTED", "Password-protected files are not supported.", 422)
            pages = len(reader.pages)
            text = "\n".join((p.extract_text() or "") for p in reader.pages[:10])
        else:
            from docx import Document

            doc = Document(io.BytesIO(data))
            text = "\n".join(p.text for p in doc.paragraphs)
            pages = None
    except AppError:
        raise
    except (PdfReadError, zipfile.BadZipFile, KeyError, ValueError, OSError):
        raise AppError("FILE_UNREADABLE", "We could not read that file.", 422) from None
    except Exception:  # parser libraries raise many types on corrupt input
        raise AppError("FILE_UNREADABLE", "We could not read that file.", 422) from None
    text = clean_text(text)[:MAX_TEXT_CHARS]
    if len(text) < MIN_TEXT_CHARS:
        raise AppError(
            "FILE_NO_TEXT",
            "No readable text found. Scanned resumes are not supported; upload a text-based PDF or DOCX, or enter details manually.",
            422,
        )
    return text, pages
