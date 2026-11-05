"""The portfolio data contract. Mirrors frontend/types/portfolio.ts (camelCase on the wire).

Everything here is rendered on a PUBLIC page, so every string is length-capped and every URL must be
http(s): `javascript:` and `data:` links are rejected at the door.
"""
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

TemplateId = Literal["blueprint", "devos", "neural-bento", "devsearch", "shiplog"]
MascotId = Literal["cyber-alien", "voxel-bot", "coder-cat", "ai-orb", "terminal-dino", "none"]
ThemeMode = Literal["dark", "light"]
AccentColor = Literal["emerald", "cyan", "violet", "amber", "rose"]


def _http_url(value: str | None) -> str | None:
    if value is None or value == "":
        return None
    value = value.strip()
    if len(value) > 500 or not value.lower().startswith(("http://", "https://")) or " " in value:
        raise ValueError("Use a full http(s) link.")
    return value


Url = Annotated[str | None, AfterValidator(_http_url)]
Short = Annotated[str, Field(max_length=200)]
Text = Annotated[str, Field(max_length=2000)]
LongText = Annotated[str, Field(max_length=6000)]
Tags = Annotated[list[Short], Field(max_length=40)]


class Camel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="ignore")


class PortfolioConfig(Camel):
    handle: str
    template_id: TemplateId = "blueprint"
    theme_mode: ThemeMode = "dark"
    mascot_id: MascotId = "cyber-alien"
    accent_color: AccentColor = "emerald"
    is_published: bool = False
    show_coding_stats: bool = True
    show_mascot: bool = True


class LeetCodeStats(Camel):
    username: Short
    profile_url: Url = None
    total_solved: int = 0
    easy_solved: int = 0
    medium_solved: int = 0
    hard_solved: int = 0
    rating: float | None = None
    global_rank: int | None = None
    top_percentage: float | None = None


class CodeChefStats(Camel):
    username: Short
    profile_url: Url = None
    rating: int = 0
    max_rating: int = 0
    stars: Annotated[str, Field(max_length=10)] = ""
    global_rank: int | None = None


class CodeforcesStats(Camel):
    username: Short
    profile_url: Url = None
    rating: int = 0
    max_rating: int = 0
    rank: Annotated[str, Field(max_length=40)] = ""


class GitHubStats(Camel):
    username: Short
    profile_url: Url = None
    public_repos: int = 0
    followers: int = 0
    total_stars: int = 0
    top_languages: Annotated[list[Short], Field(max_length=10)] = []
    avatar_url: Url = None


class CodingProfileStats(Camel):
    leetcode: LeetCodeStats | None = None
    codechef: CodeChefStats | None = None
    codeforces: CodeforcesStats | None = None
    github: GitHubStats | None = None


class Project(Camel):
    id: Annotated[str, Field(max_length=64)]
    title: Short = ""
    tagline: Short = ""
    description: Annotated[str, Field(max_length=3000)] = ""
    tech_stack: Tags = []
    github_url: Url = None
    live_url: Url = None
    image_url: Url = None
    featured: bool = False
    metrics: Short | None = None
    year: Annotated[str, Field(max_length=20)] | None = None


class Experience(Camel):
    id: Annotated[str, Field(max_length=64)]
    role: Short = ""
    company: Short = ""
    company_url: Url = None
    location: Short = ""
    start_date: Annotated[str, Field(max_length=40)] = ""
    end_date: Annotated[str, Field(max_length=40)] = ""
    description_bullets: Annotated[list[Text], Field(max_length=15)] = []
    tech_used: Tags = []


class Education(Camel):
    id: Annotated[str, Field(max_length=64)]
    degree: Short = ""
    institution: Short = ""
    location: Short = ""
    start_year: Annotated[str, Field(max_length=20)] = ""
    end_year: Annotated[str, Field(max_length=20)] = ""
    score: Short | None = None
    highlights: Annotated[list[Text], Field(max_length=10)] | None = None


class Achievement(Camel):
    id: Annotated[str, Field(max_length=64)]
    title: Short = ""
    issuer: Short = ""
    date: Annotated[str, Field(max_length=40)] | None = None
    description: Text = ""
    proof_url: Url = None


class Socials(Camel):
    github: Url = None
    linkedin: Url = None
    twitter: Url = None
    leetcode: Url = None
    codechef: Url = None
    codeforces: Url = None
    website: Url = None


class Basics(Camel):
    full_name: Short = ""
    headline: Short = ""
    short_bio: Annotated[str, Field(max_length=600)] = ""
    long_bio: LongText = ""
    email: Annotated[str, Field(max_length=320)] = ""
    phone: Annotated[str, Field(max_length=40)] | None = None
    location: Short = ""
    avatar_url: Url = None
    resume_url: Url = None
    availability_text: Short = ""
    socials: Socials = Socials()


class Skills(Camel):
    languages: Tags = []
    frameworks: Tags = []
    databases_and_cloud: Tags = []
    ai_and_ml: Tags = []
    core_cs_and_tools: Tags = []


class PortfolioData(Camel):
    config: PortfolioConfig
    basics: Basics = Basics()
    coding_stats: CodingProfileStats = CodingProfileStats()
    skills: Skills = Skills()
    projects: Annotated[list[Project], Field(max_length=30)] = []
    experience: Annotated[list[Experience], Field(max_length=20)] = []
    education: Annotated[list[Education], Field(max_length=10)] = []
    achievements: Annotated[list[Achievement], Field(max_length=30)] = []


# ---- requests / responses -------------------------------------------------------------------------

class HandleCheck(Camel):
    available: bool
    handle: str
    message: str


class ClaimIn(Camel):
    handle: str
    accepted_terms: bool


class SyncIn(Camel):
    github: Annotated[str, Field(max_length=60)] | None = None
    leetcode: Annotated[str, Field(max_length=60)] | None = None
    codechef: Annotated[str, Field(max_length=60)] | None = None
    codeforces: Annotated[str, Field(max_length=60)] | None = None


class SiteResult(Camel):
    """A saved portfolio plus plain-language notes about anything that could not be fetched."""

    data: PortfolioData
    warnings: list[str] = []
