"""Portfolio content schema, text sanitising, and the pre-publish validator.
AI output is plain text only; HTML and scripts cannot enter (Blueprint 13.3 W5, 15.6)."""
import re
from urllib.parse import urlparse
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator

_TAG = re.compile(r"<[^>]*>")
_URL = re.compile(r"https?://\S+", re.I)
_EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
_PHONE = re.compile(r"(?<!\d)(?:\+?\d[\d\s().-]{8,}\d)(?!\d)")


def plain(text: str) -> str:
    """Strip markup and control characters. Output is escaped again at render time."""
    text = _TAG.sub("", text)
    text = text.replace("<", "").replace(">", "")
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text)
    return re.sub(r"\s+", " ", text).strip()


Short = Annotated[str, Field(max_length=200)]


class _S(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Hero(_S):
    name: str = Field(default="", max_length=120)
    headline: str = Field(default="", max_length=200)

    @field_validator("name", "headline", mode="before")
    @classmethod
    def clean(cls, v):
        return plain(v or "")


class About(_S):
    text: str = Field(default="", max_length=800)

    @field_validator("text", mode="before")
    @classmethod
    def clean(cls, v):
        return plain(v or "")


class PProject(_S):
    id: str
    title: str = Field(max_length=200)
    blurb: str = Field(default="", max_length=400)
    tech: list[Annotated[str, Field(max_length=50)]] = Field(default_factory=list, max_length=20)
    links: list[Annotated[str, Field(max_length=500)]] = Field(default_factory=list, max_length=5)

    @field_validator("title", "blurb", mode="before")
    @classmethod
    def clean(cls, v):
        return plain(v or "")


class SkillGroup(_S):
    group: str = Field(max_length=60)
    skills: list[Annotated[str, Field(max_length=60)]] = Field(max_length=40)

    @field_validator("group", mode="before")
    @classmethod
    def clean(cls, v):
        return plain(v or "")


class PEducation(_S):
    institution: str = Field(max_length=200)
    degree: str = Field(default="", max_length=200)


class PAchievement(_S):
    title: str = Field(max_length=200)


class Contact(_S):
    # Sensitive fields are off by default and only published when the user opts in.
    email: str | None = Field(default=None, max_length=320)
    include_email: bool = False
    location: str | None = Field(default=None, max_length=120)
    include_location: bool = False


class PortfolioContent(_S):
    schema_version: int = 1
    sections: list[str] = Field(default_factory=lambda: ["about", "projects", "skills", "education", "achievements", "contact"])
    hero: Hero = Hero()
    about: About = About()
    projects: list[PProject] = Field(default_factory=list, max_length=30)
    skills_groups: list[SkillGroup] = Field(default_factory=list, max_length=10)
    education: list[PEducation] = Field(default_factory=list, max_length=10)
    achievements: list[PAchievement] = Field(default_factory=list, max_length=20)
    contact: Contact = Contact()

    @field_validator("sections")
    @classmethod
    def known_sections(cls, v: list[str]) -> list[str]:
        allowed = {"about", "projects", "skills", "education", "achievements", "contact"}
        if any(s not in allowed for s in v):
            raise ValueError("Unknown section")
        return list(dict.fromkeys(v))


def public_text_fields(c: PortfolioContent) -> list[tuple[str, str]]:
    out = [("hero.name", c.hero.name), ("hero.headline", c.hero.headline), ("about", c.about.text)]
    out += [(f"project:{p.title}", f"{p.title} {p.blurb}") for p in c.projects]
    return out


def allowed_hosts(links: list[str]) -> set[str]:
    return {urlparse(u).hostname for u in links if urlparse(u).hostname}


def validate(c: PortfolioContent, allowed_links: list[str]) -> dict:
    """Blocking errors prevent approval. Warnings are advice."""
    errors: list[dict] = []
    warnings: list[dict] = []

    def err(where, msg):
        errors.append({"where": where, "message": msg})

    if not c.hero.name:
        err("hero.name", "Add your name.")
    if "projects" in c.sections and not c.projects:
        warnings.append({"where": "projects", "message": "The projects section is empty."})
    if "about" in c.sections and len(c.about.text) < 30:
        warnings.append({"where": "about", "message": "Your about text is very short."})

    allowed = set(allowed_links)
    hosts = allowed_hosts(allowed_links)
    for p in c.projects:
        for link in p.links:
            parsed = urlparse(link)
            if parsed.scheme != "https":
                err(f"project:{p.title}", f"Link must use https: {link}")
            elif link not in allowed and parsed.hostname not in hosts:
                err(f"project:{p.title}", f"Link is not from your profile: {link}")

    for where, text in public_text_fields(c):
        if _EMAIL.search(text):
            err(where, "Contains an email address. Use the contact section if you want to publish it.")
        if _PHONE.search(text):
            err(where, "Contains what looks like a phone number.")
        if _URL.search(text):
            err(where, "Contains a link inside text. Add links to a project instead.")

    if c.contact.include_email and not c.contact.email:
        err("contact.email", "You chose to publish your email but none is set.")
    if c.contact.include_email:
        warnings.append({"where": "contact.email", "message": "Your email address will be public and can be scraped."})
    if c.contact.include_location:
        warnings.append({"where": "contact.location", "message": "Your location will be public."})
    return {"errors": errors, "warnings": warnings, "ok": not errors}


def consent_items(c: PortfolioContent) -> list[str]:
    """Plain-language list of exactly what becomes public."""
    items = [f"Name: {c.hero.name}", f"Headline: {c.hero.headline}"] if c.hero.name else []
    if "about" in c.sections and c.about.text:
        items.append("About text")
    if "projects" in c.sections:
        items += [f"Project: {p.title} ({len(p.links)} link(s))" for p in c.projects]
    if "skills" in c.sections:
        items += [f"Skills: {', '.join(s for g in c.skills_groups for s in g.skills)}"]
    if "education" in c.sections:
        items += [f"Education: {e.institution}" for e in c.education]
    if "achievements" in c.sections:
        items += [f"Achievement: {a.title}" for a in c.achievements]
    if "contact" in c.sections:
        if c.contact.include_email:
            items.append(f"Email address: {c.contact.email}")
        if c.contact.include_location:
            items.append(f"Location: {c.contact.location}")
    return items
