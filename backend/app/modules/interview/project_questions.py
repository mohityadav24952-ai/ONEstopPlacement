"""Strictly technical interview questions about the user's own projects.

Rules (Interview Prep overhaul):
* at most 3 projects, one day each, in resume/profile order;
* 5 to 6 questions per project;
* hardcore technical only: architecture and data flow, stack choices, schema design, auth, error handling,
  bottlenecks and scaling, security, deployment, testing, debugging. No behavioural fluff ("demonstrate
  leadership", "how did you handle conflict").

The AI writes them once per project (prompt interview_project_v1) and they are stored as the user's own
questions, so later plans reuse them with no API call. Code, not the model, enforces the rules: off-topic,
behavioural and duplicate questions are dropped, and when the model is unavailable or returns too few, the
gap is filled from technical templates built on the 25 reference questions.
"""
import re
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

# The 25 reference questions that set the required technical depth (sent to the model with every request).
REFERENCE_QUESTIONS = [
    "Can you explain your project's architecture and the complete flow of data from the frontend UI to the database?",
    "Why did you choose this specific tech stack (e.g., React, Node, Python) instead of alternative languages or frameworks?",
    "What problem does your project solve in the real world, and who is the ideal target user?",
    "How did you design your database schema? Explain your primary keys, foreign keys, and table/collection relationships.",
    "What architectural pattern (like MVC, Monolithic, or Layered) did you use, and why did you choose it?",
    "What was your exact individual contribution to this project compared to your other teammates?",
    "Which specific module or feature did you write completely by yourself? Walk me through its code logic.",
    "How did you handle user authentication and authorization (e.g., JWT, OAuth, Sessions) in this project?",
    "How does your application handle runtime errors, exceptions, or invalid data inputs from users?",
    "What Git branching strategy or workflow did you and your team follow to avoid breaking the main codebase?",
    "If 50,000 users start using your application simultaneously right now, where will the system break first (bottleneck)?",
    "How would you optimize a slow database query or API endpoint in your project? Did you use indexing or caching?",
    "How did you secure your frontend and backend against common vulnerabilities like SQL Injection or XSS?",
    "How did you handle sensitive information like API keys, database credentials, and environment variables?",
    "If you had to scale this project to a microservices architecture, how would you split up your modules?",
    "How did you deploy and host your project (e.g., AWS, Vercel, Render), and what deployment challenges did you face?",
    "How did you test your code? Did you write automated unit/integration tests, or did you do purely manual testing?",
    "How did you manage external dependencies and package versions to avoid dependency conflicts or security issues?",
    "Did you implement any third-party APIs or webhooks (e.g., Payment gateways, Maps)? How did you handle their downtime?",
    "How did you track bugs or manage development tasks while building this project (e.g., Jira, Trello, Git Issues)?",
    "What was the single most difficult technical blocker you faced during development, and exactly how did you debug and solve it?",
    "If you had to rebuild this entire project from scratch today, what technical decisions or design choices would you change?",
    "What is the biggest piece of technical debt or messy code you left behind in this project, and why did you leave it?",
    "If a client asks you to add a real-time feature (like instant chat or live notifications) to this project today, how would you design it?",
    "Imagine you are reviewing your project's code right now. Show me one function or block that you are extremely proud of and explain why.",
]

MAX_PROJECTS = 3
MIN_PER_PROJECT = 5
MAX_PER_PROJECT = 6

# Behavioural / soft-skill wording that must never appear in a project question.
_BEHAVIOURAL = re.compile(
    r"\b(leadership|leader|lead(ing)? (a|the) team|motivat\w*|conflicts? (with|between) (a |your )?(team\w*|colleague\w*|manager|member\w*|peer\w*)|disagree\w*|strengths?|weakness\w*|passion\w*|"
    r"teamwork|soft skills?|how did you feel|feelings?|personality|work[- ]life|stress(ful)?|demonstrate)\b",
    re.I,
)
# A question must touch at least one technical concept to count.
_TECHNICAL = re.compile(
    r"\b(architect\w*|languages?|trade-?offs?|data ?flow|stack|framework|librar\w+|database|schema|tables?|collections?|keys?|index\w*|cach\w*|"
    r"quer\w+|api|endpoint|auth\w*|jwt|oauth|session|token|error|exception|validat\w*|bottleneck|scal\w+|load|latency|"
    r"concurren\w*|thread|secur\w*|injection|xss|csrf|secrets?|environment|deploy\w*|host\w*|docker|ci/?cd|pipeline|tests?|"
    r"testing|unit|integration|debug\w*|bug|git|branch\w*|dependenc\w*|version\w*|webhook|third-party|microservice\w*|"
    r"real-time|websocket|socket|module|function|code|algorithm|complexity|memory|performance|optimi[sz]\w*|model|"
    r"inference|pipeline|server|client|frontend|backend|state|storage|queue|rate limit\w*|design)\b",
    re.I,
)


class _Q(BaseModel):
    model_config = ConfigDict(extra="ignore")
    text: str = Field(min_length=15, max_length=400)
    difficulty: str = "MEDIUM"


class _Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    project_id: str
    questions: list[_Q] = Field(default_factory=list, max_length=12)


class ProjectQuestionsOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    projects: list[_Project] = Field(default_factory=list, max_length=6)


def is_technical(text: str) -> bool:
    return not _BEHAVIOURAL.search(text) and bool(_TECHNICAL.search(text))


def _norm(text: str) -> str:
    return re.sub(r"\W+", " ", text.lower()).strip()


def _stack(tech: list[str]) -> str:
    tech = [t for t in tech if t][:3]
    return ", ".join(tech) if tech else "this tech stack"


def templates(title: str, tech: list[str], index: int) -> list[tuple[str, str]]:
    """Technical fallback questions modelled on the 25 reference questions, one per theme, rotated by the
    project's position so three projects do not get the same six questions."""
    t = f'"{title}"'
    s = _stack(tech)
    themes: list[list[tuple[str, str]]] = [
        [  # architecture
            ("MEDIUM", f"Explain the architecture of {t} and the complete flow of data from the frontend UI to the database."),
            ("MEDIUM", f"What architectural pattern (MVC, layered, monolithic) did you use in {t}, and why did you choose it?"),
            ("MEDIUM", f"How did you design the database schema for {t}? Explain the keys, relationships and why you modelled it that way."),
        ],
        [  # stack choice
            ("MEDIUM", f"Why did you choose {s} for {t} instead of alternative languages or frameworks? What are the trade-offs?"),
            ("MEDIUM", f"Which module of {t} did you write yourself? Walk me through its code logic step by step."),
            ("MEDIUM", f"How does {t} handle authentication and authorization (JWT, OAuth or sessions), and where are tokens validated?"),
        ],
        [  # robustness and security
            ("MEDIUM", f"How does {t} handle runtime errors, exceptions and invalid user input at the API and UI layers?"),
            ("HARD", f"How did you secure {t} against SQL injection, XSS and CSRF, and how do you store API keys and secrets?"),
            ("MEDIUM", f"How did you manage dependencies and package versions in {t} to avoid conflicts and known vulnerabilities?"),
        ],
        [  # scale and performance
            ("HARD", f"If 50,000 users hit {t} at the same time, where would the system break first, and how would you fix that bottleneck?"),
            ("HARD", f"How would you optimise the slowest query or API endpoint in {t}? Would you add indexing, caching or pagination?"),
            ("HARD", f"If you had to split {t} into microservices, how would you divide the modules and how would they communicate?"),
        ],
        [  # delivery
            ("MEDIUM", f"How did you deploy and host {t}, and what deployment problems did you hit (environment variables, CORS, builds)?"),
            ("MEDIUM", f"How did you test {t}? Which parts have automated unit or integration tests, and which were tested manually?"),
            ("MEDIUM", f"Which third-party APIs does {t} depend on, and how does it behave when one of them is slow or down?"),
        ],
        [  # debugging and design reflection
            ("HARD", f"What was the hardest technical bug in {t}, and exactly how did you debug and fix it?"),
            ("HARD", f"If you rebuilt {t} from scratch today, which technical design decisions would you change and why?"),
            ("HARD", f"How would you add a real-time feature such as live notifications to {t}? Which protocol and architecture would you use?"),
        ],
    ]
    return [theme[(index + k) % len(theme)] for k, theme in enumerate(themes)]


def clean(project: dict[str, Any], index: int, generated: list[_Q]) -> list[tuple[str, str]]:
    """5 to 6 technical questions for one project: the model's questions that pass the rules, topped up with
    templates. Returns (difficulty, text)."""
    out: list[tuple[str, str]] = []
    seen: set[str] = set()
    for q in generated:
        text = " ".join(q.text.split())
        if not text.endswith("?"):
            text = text.rstrip(".") + "?"
        key = _norm(text)
        if key in seen or not is_technical(text):
            continue
        seen.add(key)
        out.append((q.difficulty if q.difficulty in ("EASY", "MEDIUM", "HARD") else "MEDIUM", text))
        if len(out) == MAX_PER_PROJECT:
            return out
    for difficulty, text in templates(project["title"], project.get("tech") or [], index):
        if len(out) >= MAX_PER_PROJECT:
            break
        key = _norm(text)
        if key not in seen:
            seen.add(key)
            out.append((difficulty, text))
    return out[:MAX_PER_PROJECT]
