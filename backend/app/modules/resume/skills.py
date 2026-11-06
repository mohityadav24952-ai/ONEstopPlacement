"""Deterministic skill normalisation. Canonical name -> synonyms (all lowercase).

Detection has to survive what PDF text extraction really produces, so matching is done on cleaned text:
Unicode is normalised (full-width "＋", ligatures, odd dashes, zero-width characters), "C ++" is rejoined
to "C++", and line-wrapped phrases are collapsed to single spaces. Symbol-ending skills such as C++ and C#
may be followed by a version ("C++17", "C++20") or by the next word without a space ("C++/Java").
"""
import re
import unicodedata
from functools import lru_cache

SYNONYMS: dict[str, set[str]] = {
    "python": {"python", "python3"},
    "java": {"java"},
    "javascript": {"javascript", "js", "ecmascript"},
    "typescript": {"typescript", "ts"},
    "react": {"react", "reactjs", "react.js"},
    "node": {"node", "nodejs", "node.js"},
    "sql": {"sql", "mysql", "postgresql", "postgres", "sqlite"},
    "docker": {"docker", "containers", "containerization"},
    "kubernetes": {"kubernetes", "k8s"},
    "aws": {"aws", "amazon web services"},
    "git": {"git", "github", "version control"},
    "fastapi": {"fastapi"},
    "django": {"django"},
    "flask": {"flask"},
    "c++": {"c++", "cpp"},
    "machine learning": {"machine learning", "ml", "scikit-learn", "sklearn"},
    "data structures": {"data structures", "dsa", "algorithms", "data structures and algorithms"},
    "rest": {"rest", "rest api", "restful", "rest apis", "api design"},
    "html": {"html", "html5"},
    "css": {"css", "css3", "tailwind"},
    "linux": {"linux", "unix"},
    # Added with the parser fix: common resume skills that were never detected at all.
    "c#": {"c#", "csharp", "c sharp"},
    "golang": {"golang"},
    "rust": {"rust"},
    "mongodb": {"mongodb", "mongo db"},
    "express": {"expressjs", "express.js"},
    "next.js": {"next.js", "nextjs"},
    "spring": {"spring boot", "springboot"},
    "tensorflow": {"tensorflow"},
    "pytorch": {"pytorch"},
    "pandas": {"pandas"},
    "numpy": {"numpy"},
    "redis": {"redis"},
    "graphql": {"graphql"},
    "oop": {"oop", "oops", "object oriented programming", "object-oriented programming"},
}

_LOOKUP = {syn: canon for canon, syns in SYNONYMS.items() for syn in syns}

# How a canonical skill is written when we have to display it.
PRETTY = {
    "c++": "C++", "c#": "C#", "sql": "SQL", "aws": "AWS", "css": "CSS", "html": "HTML", "rest": "REST",
    "oop": "OOP", "javascript": "JavaScript", "typescript": "TypeScript", "node": "Node.js", "fastapi": "FastAPI",
    "mongodb": "MongoDB", "graphql": "GraphQL", "next.js": "Next.js", "pytorch": "PyTorch", "tensorflow": "TensorFlow",
    "golang": "Go", "git": "Git", "docker": "Docker", "kubernetes": "Kubernetes", "machine learning": "Machine Learning",
    "data structures": "Data Structures",
}


def pretty(canon: str) -> str:
    return PRETTY.get(canon) or canon.title()


_INVISIBLE = {ord(c): None for c in "​‌‍⁠﻿­"}
_DASHES = {ord(c): "-" for c in "‐‑‒–—−"}
_SPLIT_PLUS = re.compile(r"\b([A-Za-z])[ \t]+(\+\+|#)")


def clean_text(text: str) -> str:
    """Resume text as it should be matched: stable Unicode, no invisible characters, "C ++" rejoined."""
    t = unicodedata.normalize("NFKC", text).translate(_INVISIBLE).translate(_DASHES)
    return _SPLIT_PLUS.sub(r"\1\2", t)


_VERSIONED = re.compile(r"^(c\+\+|c#)\d+$")


def normalize(name: str) -> str:
    n = " ".join(clean_text(name).lower().split())
    n = _VERSIONED.sub(lambda m: m.group(1), n)  # "C++17" is still C++
    return _LOOKUP.get(n, n)


@lru_cache(maxsize=None)
def _pattern(syn: str) -> re.Pattern[str]:
    tokens = [re.escape(t) for t in re.split(r"[ \-]", syn) if t]
    body = r"[\s\-]?".join(tokens)  # "scikit learn", "scikit-learn" and "scikitlearn" all match
    tail = r"(?![+#])" if syn[-1] in "+#" else r"(?![\w+#])"  # C++17 / C++Java are fine, C+++ and C#x are not
    return re.compile(rf"(?<![\w+#]){body}{tail}", re.IGNORECASE)


def skill_mentions(text: str) -> list[tuple[str, str, str]]:
    """(canonical skill, text as written, the line it was found on), first mention of each skill only."""
    cleaned = clean_text(text)
    out: list[tuple[str, str, str]] = []
    for canon, syns in SYNONYMS.items():
        best = None
        for syn in syns:
            m = _pattern(syn).search(cleaned)
            if m and (best is None or m.start() < best.start()):
                best = m
        if best:
            start = cleaned.rfind("\n", 0, best.start()) + 1
            end = cleaned.find("\n", best.end())
            out.append((canon, best.group(0), cleaned[start: end if end != -1 else len(cleaned)].strip()))
    return out


def find_skills(text: str) -> list[str]:
    """Canonical skills mentioned in free text (whole-word match, tolerant of PDF extraction quirks)."""
    return [canon for canon, _, _ in skill_mentions(text)]
