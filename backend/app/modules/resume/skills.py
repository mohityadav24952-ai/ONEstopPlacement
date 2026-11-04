"""Deterministic skill normalisation. Canonical name -> synonyms (all lowercase)."""
import re

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
}

_LOOKUP = {syn: canon for canon, syns in SYNONYMS.items() for syn in syns}


def normalize(name: str) -> str:
    n = " ".join(name.lower().split())
    return _LOOKUP.get(n, n)


def find_skills(text: str) -> list[str]:
    """Canonical skills mentioned in free text (whole-word match)."""
    lowered = text.lower()
    found = []
    for canon, syns in SYNONYMS.items():
        for syn in syns:
            if re.search(rf"(?<![\w+#]){re.escape(syn)}(?![\w+#])", lowered):
                found.append(canon)
                break
    return found
