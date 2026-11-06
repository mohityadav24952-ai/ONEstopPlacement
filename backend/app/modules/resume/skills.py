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


# ---------------------------------------------------------------------------------------------------
# Skill categories (the sub-headings of a resume's Skills section)
# ---------------------------------------------------------------------------------------------------
# The AI parser assigns a category when it reads a resume. This table is the deterministic fallback for skills
# that arrive without one (typed in by hand, found by the taxonomy safety net, or from an older parse).
SKILL_CATEGORIES = (
    "Languages", "Frameworks & Libraries", "Backend & Databases", "Cloud & DevOps", "AI / ML",
    "Developer Tools", "Core CS Concepts", "Other",
)
_CATEGORY_TERMS: dict[str, tuple[str, ...]] = {
    "Languages": (
        "c", "c++", "cpp", "c#", "java", "python", "python3", "javascript", "js", "typescript", "ts", "go", "golang",
        "rust", "kotlin", "swift", "ruby", "php", "r", "scala", "dart", "perl", "matlab", "sql", "bash", "shell",
        "html", "html5", "css", "css3", "c/c++", "solidity", "haskell", "lua", "objective-c",
    ),
    "Frameworks & Libraries": (
        "react", "react.js", "reactjs", "next.js", "nextjs", "vue", "vue.js", "angular", "svelte", "tailwind",
        "tailwind css", "bootstrap", "redux", "react native", "flutter", "jquery", "spring", "spring boot", "django",
        "flask", "fastapi", "socket.io", "javafx",
        "tkinter", "pygame", "numpy", "pandas", "matplotlib", "junit", "pytest", ".net", "asp.net", "laravel", "rails",
    ),
    "Backend & Databases": (
        "node", "node.js", "nodejs", "express", "express.js", "expressjs",
        "mongodb", "mysql", "postgresql", "postgres", "sqlite", "redis", "firebase", "supabase", "oracle", "dynamodb",
        "cassandra", "elasticsearch", "graphql", "rest", "rest api", "rest apis", "restful", "jdbc", "prisma",
        "mongoose", "sqlalchemy", "microservices", "kafka", "rabbitmq", "websockets", "webrtc",
    ),
    "Cloud & DevOps": (
        "aws", "amazon web services", "azure", "gcp", "google cloud", "docker", "kubernetes", "k8s", "terraform",
        "jenkins", "github actions", "ci/cd", "nginx", "linux", "vercel", "netlify", "heroku", "s3", "ec2", "lambda",
    ),
    "AI / ML": (
        "machine learning", "ml", "deep learning", "tensorflow", "pytorch", "keras", "scikit-learn", "sklearn",
        "opencv", "nlp", "computer vision", "llm", "llms", "rag", "langchain", "langgraph", "prompt engineering",
        "generative ai", "genai", "hugging face", "transformers", "ai agents", "vector databases", "mcp", "ollama",
    ),
    "Developer Tools": (
        "git", "github", "gitlab", "bitbucket", "vs code", "visual studio code", "visual studio", "postman", "jira",
        "figma", "intellij", "eclipse", "jupyter", "npm", "yarn", "webpack", "vite", "unity", "blender", "wsl",
        "version control", "android studio", "colab", "google colab",
    ),
    "Core CS Concepts": (
        "data structures", "algorithms", "data structures and algorithms", "data structures & algorithms", "dsa",
        "oop", "oops", "object oriented programming", "object-oriented programming", "dbms",
        "database management systems", "operating systems", "os", "computer networks", "cn", "system design",
        "multithreading", "sdlc", "design patterns", "computer organization", "compiler design",
    ),
}
_CATEGORY_OF = {term: cat for cat, terms in _CATEGORY_TERMS.items() for term in terms}
# Free-text categories an AI or a resume may use, folded onto the standard headings where they clearly mean the same.
_CATEGORY_ALIASES = {
    "programming languages": "Languages", "languages": "Languages", "language": "Languages",
    "frameworks": "Frameworks & Libraries", "libraries": "Frameworks & Libraries", "frameworks & libraries": "Frameworks & Libraries",
    "frameworks and libraries": "Frameworks & Libraries", "web technologies": "Frameworks & Libraries", "frontend": "Frameworks & Libraries",
    "databases": "Backend & Databases", "database": "Backend & Databases", "backend": "Backend & Databases",
    "backend & databases": "Backend & Databases", "backend and databases": "Backend & Databases",
    "cloud": "Cloud & DevOps", "devops": "Cloud & DevOps", "cloud & devops": "Cloud & DevOps", "cloud & distributed systems": "Cloud & DevOps",
    "ai/ml": "AI / ML", "ai / ml": "AI / ML", "ai / ml & genai": "AI / ML", "machine learning": "AI / ML", "ai": "AI / ML",
    "tools": "Developer Tools", "developer tools": "Developer Tools", "tools & practices": "Developer Tools", "dev tools": "Developer Tools",
    "core cs concepts": "Core CS Concepts", "cs core fundamentals": "Core CS Concepts", "concepts": "Core CS Concepts",
    "cs fundamentals": "Core CS Concepts", "core subjects": "Core CS Concepts", "coursework": "Core CS Concepts",
}


def categorize(name: str, given: str | None = None) -> str:
    """The Skills sub-heading for a skill. A category the user (or the AI parser) gave wins when it is a known
    heading or a clear alias of one; an unknown but non-empty category is kept as written (it is the user's own
    grouping, e.g. "Currently Learning"). Otherwise the deterministic table decides."""
    if given and given.strip():
        g = " ".join(given.split())
        return _CATEGORY_ALIASES.get(g.lower(), g if g in SKILL_CATEGORIES else g[:50])
    n = " ".join(clean_text(name).lower().split())
    if n in _CATEGORY_OF:
        return _CATEGORY_OF[n]
    canon = normalize(name)
    if canon in _CATEGORY_OF:
        return _CATEGORY_OF[canon]
    base = re.sub(r"\s*\(.*?\)\s*", " ", n).strip()  # "Docker (Basic)" -> "docker"
    return _CATEGORY_OF.get(base, "Other")


def group_skills(names: list[str], categories: dict[str, str]) -> list[dict]:
    """[{"category", "items"}] in the standard heading order (custom headings after, "Other" last).
    Items keep their given order, which is relevance order."""
    groups: dict[str, list[str]] = {}
    for n in names:
        groups.setdefault(categories.get(n) or categorize(n), []).append(n)
    rank = {c: i for i, c in enumerate(SKILL_CATEGORIES)}
    order = sorted(groups, key=lambda c: (c == "Other", rank.get(c, len(SKILL_CATEGORIES) - 1)))
    return [{"category": c, "items": groups[c]} for c in order]


def find_skills(text: str) -> list[str]:
    """Canonical skills mentioned in free text (whole-word match, tolerant of PDF extraction quirks)."""
    return [canon for canon, _, _ in skill_mentions(text)]
