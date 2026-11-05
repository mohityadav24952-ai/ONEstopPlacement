"""DSA practice as LINK CARDS to external platforms, built for the chosen company and role.

There are no DSA problem statements in this app. Each card is a link to a page on LeetCode,
GeeksforGeeks or Naukri Code360 that those platforms keep up to date themselves, so what a user
sees there is always the platform's current content, not a copy that goes stale.

Honesty notes (also shown in the UI):
* We do not scrape these sites and we do not know which problems a company asked recently.
  A card says where to look, never "Google asks X".
* "Newest first" is requested through the platform's own sort option or by putting the current year
  in the search. Whether a platform honours it is up to the platform.
* LeetCode company problem lists may need a LeetCode Premium account.
"""
import datetime as dt
import re
from typing import TypedDict
from urllib.parse import quote, quote_plus

from app.modules.interview.resources import ALLOWED_HOSTS, LEETCODE_COMPANY_SLUG, clean_company

GFG = "https://www.geeksforgeeks.org"
LC = "https://leetcode.com"
CODE360 = "https://www.naukri.com/code360"

ALLOWED = (*ALLOWED_HOSTS, "www.naukri.com")


class Card(TypedDict):
    title: str
    description: str
    button: str  # e.g. "Solve on LeetCode"
    url: str
    platform: str  # LEETCODE | GEEKSFORGEEKS | CODE360


def _card(title: str, description: str, button: str, url: str, platform: str) -> Card:
    assert url.startswith("https://") and url.split("/")[2] in ALLOWED, url  # fixed hosts only
    return {"title": title, "description": description, "button": button, "url": url, "platform": platform}


def clean_role(role: str | None) -> str:
    return " ".join(re.findall(r"[A-Za-z0-9+#.]+", role or ""))[:40].strip()


def dsa_cards(company: str | None, role: str | None, year: int | None = None) -> list[Card]:
    """Company- and role-specific link cards, most useful first."""
    c = clean_company(company)
    if not c:
        return []
    label = c.title()
    r = clean_role(role)
    y = year or dt.date.today().year
    cards: list[Card] = []

    # 1. practice lists the platforms keep per company
    slug = LEETCODE_COMPANY_SLUG.get(c)
    if slug:
        cards.append(_card(f"{label} problems on LeetCode",
                           "LeetCode's own company page, which usually lets you sort by how recently questions were reported. Some of it may need Premium.",
                           "Solve on LeetCode", f"{LC}/company/{slug}/", "LEETCODE"))
    cards.append(_card(f"{label} practice problems on GeeksforGeeks",
                       "GeeksforGeeks' practice list filtered to this company.",
                       "Solve on GFG", f"{GFG}/explore?company={quote(label)}", "GEEKSFORGEEKS"))
    cards.append(_card(f"{label} on Naukri Code360",
                       "Search Code360 for this company's interview problems and experiences.",
                       "Naukri Code360", f"{CODE360}/search?q={quote_plus(c)}", "CODE360"))

    # 2. what other candidates report, newest first where the platform allows it
    variants = [
        (f"interview experience {y}", f"{label}: interview experiences, {y}"),
        (f"online assessment {y}", f"{label}: online assessment, {y}"),
        ("coding round", f"{label}: coding round"),
        ("DSA interview questions", f"{label}: DSA interview questions"),
    ]
    if r:
        variants.append((f"{r} interview questions", f"{label}: {r} interview questions"))
        variants.append((f"{r} interview experience {y}", f"{label}: {r} interview experience, {y}"))
    variants += [("previous year questions", f"{label}: previous-year questions"), ("fresher interview experience", f"{label}: fresher interview experience")]

    for phrase, title in variants:
        q = f"{c} {phrase}"
        cards.append(_card(title + " (LeetCode Discuss)", "Candidate posts, newest first. Opens LeetCode's own search.",
                           "Read on LeetCode", f"{LC}/discuss/interview-experience?currentPage=1&orderBy=newest_to_oldest&query={quote(q)}", "LEETCODE"))
        cards.append(_card(title + " (GeeksforGeeks)", "Articles and experiences. Opens GeeksforGeeks' own search.",
                           "Read on GFG", f"{GFG}/search/?q={quote_plus(q)}", "GEEKSFORGEEKS"))
    cards.append(_card(f"{label} interview experiences on Code360", "Candidate write-ups on Naukri Code360.",
                       "Naukri Code360", f"{CODE360}/interview-experiences", "CODE360"))

    seen: set[str] = set()
    unique = []
    for card in cards:
        if card["url"] not in seen:
            seen.add(card["url"])
            unique.append(card)
    return unique
