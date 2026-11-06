"""Hyperlinks from a resume's LaTeX source.

Text extracted from a PDF loses its hyperlinks ("GitHub" is just a word). When the user also uploads the
.tex file the PDF was built from, its \\href{url}{text} and \\url{url} commands say exactly where each link
pointed. Nothing found here reaches a resume on its own: every link starts as "pending" and is only injected
after the user allows it.

The file is treated as untrusted text: it is never compiled or executed, only scanned with a brace-aware
reader, and only http(s), mailto and tel links are kept.
"""
import re

MAX_TEX_BYTES = 512 * 1024
MAX_LINKS = 40
_SAFE_SCHEMES = ("https://", "http://", "mailto:", "tel:")
_CMD = re.compile(r"\\(href|url)\s*\{")
_LATEX_CMD = re.compile(r"\\[a-zA-Z]+\*?(\[[^\]]*\])?")


def _group(src: str, start: int) -> tuple[str, int] | None:
    """The contents of the {...} group opening at src[start] (nested braces allowed), and the index after it."""
    if start >= len(src) or src[start] != "{":
        return None
    depth = 0
    for i in range(start, min(len(src), start + 2000)):
        ch = src[i]
        if ch == "\\":
            continue
        if ch == "{" and (i == 0 or src[i - 1] != "\\"):
            depth += 1
        elif ch == "}" and src[i - 1] != "\\":
            depth -= 1
            if depth == 0:
                return src[start + 1:i], i + 1
    return None


def _plain(tex: str) -> str:
    """Readable text of a LaTeX fragment: "\\underline{\\textbf{GitHub}}" -> "GitHub"."""
    t = _LATEX_CMD.sub("", tex)
    t = t.replace("\\&", "&").replace("\\%", "%").replace("\\_", "_").replace("\\#", "#").replace("\\$", "$")
    t = t.replace("~", " ").replace("{", "").replace("}", "").replace("\\", "")
    return " ".join(t.split())


def _strip_comments(src: str) -> str:
    return re.sub(r"(?<!\\)%.*", "", src)


def _clean_url(url: str) -> str | None:
    u = url.strip().replace("\\%", "%").replace("\\_", "_").replace("\\#", "#").replace("\\&", "&")
    u = re.sub(r"\s+", "", u)
    if not u.lower().startswith(_SAFE_SCHEMES) or len(u) > 500:
        return None
    return u


def label_for(url: str) -> str:
    """A short visible label for a link that came without one (\\url{...})."""
    u = url.lower()
    for host, name in (("github.com", "GitHub"), ("linkedin.com", "LinkedIn"), ("leetcode.com", "LeetCode"),
                       ("codechef.com", "CodeChef"), ("codeforces.com", "Codeforces"), ("hackerrank.com", "HackerRank"),
                       ("geeksforgeeks.org", "GeeksforGeeks")):
        if host in u:
            return name
    if u.startswith("mailto:"):
        return url[7:]
    if u.startswith("tel:"):
        return url[4:]
    return re.sub(r"^https?://(www\.)?", "", url).rstrip("/")[:80]


def extract_links(tex_source: str) -> list[dict]:
    """[{"text", "url", "status": "pending"}], one per distinct (text, url), in document order."""
    src = _strip_comments(tex_source)
    out: list[dict] = []
    seen: set[tuple[str, str]] = set()
    for m in _CMD.finditer(src):
        first = _group(src, m.end() - 1)
        if first is None:
            continue
        url = _clean_url(first[0])
        if not url:
            continue
        if m.group(1) == "href":
            rest = src[first[1]:]
            ws = len(rest) - len(rest.lstrip())
            second = _group(src, first[1] + ws)
            text = _plain(second[0]) if second else ""
        else:
            text = ""
        text = (text or label_for(url))[:120]
        key = (text.lower(), url)
        if key in seen:
            continue
        seen.add(key)
        out.append({"text": text, "url": url, "status": "pending"})
        if len(out) >= MAX_LINKS:
            break
    return out


def decode(data: bytes) -> str:
    for enc in ("utf-8", "latin-1"):
        try:
            return data.decode(enc)
        except UnicodeDecodeError:
            continue
    return ""
