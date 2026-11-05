"""Light, rule-based re-wording of the core-subject master questions.

No AI and no web: a fixed set of sentence patterns, with the variant chosen deterministically from
(plan seed, question id). The same plan therefore always shows the same wording, a new plan shows
fresh wording, and the meaning never changes because only the framing words are swapped, never the
subject terms. Anything that does not match a pattern is returned untouched.
"""
import hashlib
import random
import re
from collections.abc import Callable

Variants = Callable[[re.Match[str], str], list[str]]


def _tail(rest: str | None) -> str:
    return f" {rest.strip()}" if rest and rest.strip() else ""


def _what_is(m: re.Match[str], tail: str) -> list[str]:
    x = m.group(2)
    out = [f"Explain {x}.{tail}", f"Tell me about {x}.{tail}"]
    if not tail:  # question-shaped variants only read well on a single-sentence question
        out += [f"Can you explain {x}?", f"How would you describe {x}?", f"What is {x}?"]
    return out


def _difference(m: re.Match[str], tail: str) -> list[str]:
    a, b = m.group(1).strip(), m.group(2).strip()
    extra = ""
    if m.group(3):
        t = m.group(3).strip(" .,?")
        extra = f" Also cover: {t}." if t and t[0].islower() else (f" {t}." if t else "")
    return [
        f"How do {a} and {b} differ?{extra}",
        f"Compare {a} and {b}.{extra}",
        f"Explain the difference between {a} and {b}.{extra}",
    ]


def _define(m: re.Match[str], tail: str) -> list[str]:
    x = m.group(1).strip(" ?.")
    return [f"Explain {x}.", f"What do you mean by {x}?", f"Define {x}."]


def _explain(m: re.Match[str], tail: str) -> list[str]:
    x = m.group(1).strip(" ?.")
    return [f"Can you explain {x}?", f"Walk me through {x}.", f"Explain {x}."]


def _why_occur(m: re.Match[str], tail: str) -> list[str]:
    x = m.group(1)
    return [f"What causes {x}?", f"Why does {x} occur?"]


# (pattern, builder). Patterns see the tidy text; `tail` is whatever follows the first sentence.
_RULES: list[tuple[re.Pattern[str], Variants]] = [
    (re.compile(r"^What is the difference between (.+?) and (.+?)\?()$", re.I), _difference),
    (re.compile(r"^Difference between (.+?) and (.+?)(?:[?.,]\s*(.*?))?[.?]?$", re.I), _difference),
    (re.compile(r"^(What (?:is|are)) ((?:(?!\?).)+)\?(?:\s+(.*))?$", re.I), _what_is),
    (re.compile(r"^Why does (.+?) occur\?$", re.I), _why_occur),
    (re.compile(r"^Define (.+?)[.?]*$", re.I), _define),
    (re.compile(r"^Explain (.+?)[.?]*$", re.I), _explain),
]


def paraphrase(text: str, seed: int, key: str = "") -> str:
    """Return `text` re-worded, deterministically for (seed, key). Unmatched text comes back as is."""
    rng = random.Random(int(hashlib.sha256(f"{seed}:{key or text}".encode()).hexdigest()[:12], 16))
    for pattern, build in _RULES:
        m = pattern.match(text.strip())
        if not m:
            continue
        if build is _what_is and re.search(r"\b(how|why|when)\b", m.group(2), re.I):
            return text  # a two-part question: re-framing it would read badly
        if build is _what_is:
            tail = _tail(m.group(3))
            # `_what_is` reads group(2) as the subject, group(3) as the rest
            return rng.choice(build(m, tail))
        return rng.choice(build(m, ""))
    return text
