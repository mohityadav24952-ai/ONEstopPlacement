"""Text hygiene for resume content: whitespace, bullet splitting and de-duplication keys.

PDF text extraction hard-wraps lines in the middle of sentences ("...integrated\\nterminal, and..."). If those
breaks survive, a single sentence ends up split across random bullets. Everything here is deterministic:
  * `tidy` joins wrapped lines into one line of text;
  * `split_points` turns a paragraph into bullets at real boundaries only (bullet glyphs or sentence ends),
    never in the middle of a sentence, and never after an abbreviation such as "e.g." or "B.Tech.";
  * `dedupe_key` is the comparison key used to remove duplicate entries (same item parsed or imported twice).
"""
import re

_BULLET_GLYPHS = "•●▪‣◦➢►"
# At the start of a line any bullet glyph (or "- ") starts a point. Mid-line only the unambiguous round/square
# bullets do: "·" is excluded on purpose because resumes use it to separate a tech stack ("FastAPI · SQLite").
_BULLET_SPLIT = re.compile(rf"(?:^|\n)\s*(?:[{_BULLET_GLYPHS}]|[-*–](?=\s))\s*|\s+[•●▪]\s+")
# A sentence ends at . ! or ? followed by whitespace and a capital letter, digit or opening quote/bracket.
_SENTENCE_END = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9\"'(\[])")
_ABBREVIATIONS = {
    "e.g", "i.e", "etc", "vs", "inc", "ltd", "co", "jr", "sr", "dr", "mr", "mrs", "ms", "st", "no", "approx",
    "b.tech", "m.tech", "b.e", "m.e", "b.sc", "m.sc", "b.s", "m.s", "ph.d", "u.s", "u.k", "dept", "govt", "univ",
}
_TECH_LINE = re.compile(r"^(technologies|tech stack|tech|tools used|built with|stack)\s*:", re.I)


def tidy(text: str | None) -> str:
    """One clean line: wrapped lines rejoined, repeated spaces collapsed, stray bullet glyphs removed."""
    if not text:
        return ""
    t = re.sub(r"-\n(?=[a-z])", "", text)  # "develop-\nment" -> "development"
    t = " ".join(t.split())
    return t.strip(f" {_BULLET_GLYPHS}")


def _ends_with_abbreviation(chunk: str) -> bool:
    words = chunk.rstrip().split()
    if not words:
        return False
    last = words[-1].lower().rstrip(".!?")
    return last in _ABBREVIATIONS or (len(last) == 1 and last.isalpha())  # an initial such as "J."


def _sentences(paragraph: str) -> list[str]:
    out: list[str] = []
    start = 0
    for m in _SENTENCE_END.finditer(paragraph):
        piece = paragraph[start:m.start()]
        if _ends_with_abbreviation(piece):
            continue
        out.append(piece.strip())
        start = m.end()
    out.append(paragraph[start:].strip())
    return [s for s in out if s]


def split_points(text: str | None, *, max_len: int = 500) -> list[str]:
    """Bullets from free text. Splits on bullet glyphs and on sentence ends only.

    A fragment of fewer than four words is glued to the bullet before it (it was a wrapped tail, not a point),
    and "Technologies: ..." lines are dropped because the tech stack is shown separately."""
    if not text or not text.strip():
        return []
    chunks = [c for c in _BULLET_SPLIT.split("\n" + text) if c and c.strip()]
    points: list[str] = []
    for chunk in chunks:
        for sentence in _sentences(tidy(chunk)):
            if _TECH_LINE.match(sentence):
                continue
            if points and len(sentence.split()) < 4 and not points[-1].endswith((".", "!", "?")):
                points[-1] = f"{points[-1]} {sentence}"
            else:
                points.append(sentence)
    out, seen = [], set()
    for p in points:
        p = p[:max_len].strip()
        key = dedupe_key(p)
        if p and key not in seen:  # the same sentence twice is one bullet
            seen.add(key)
            out.append(p)
    return out


def dedupe_key(*parts: str | None) -> str:
    """Case-, space- and punctuation-insensitive key ("Graphic Era Univ." == "graphic era univ")."""
    return "|".join(re.sub(r"[^a-z0-9+#]+", "", (p or "").lower()) for p in parts)
