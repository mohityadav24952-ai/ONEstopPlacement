"""Curated links to trusted external prep material (GeeksforGeeks, LeetCode).

Design rules, in the spirit of the rest of the module (every question carries its origin):

* We only ever emit LANDING, TOPIC and SEARCH pages whose URL shape is stable. We never invent a
  link to a specific article or thread, because a made-up link that 404s is worse than none.
* Every URL is built from a fixed template; the only user-supplied piece is the company/topic
  text, which is slugified or URL-encoded. Hosts are fixed, so no input can send the user elsewhere.
* The response says plainly that these are third-party pages we have not reviewed, and that none
  of it is claimed to be what a given company asks.

URL status (checked 2026-11-05): all GeeksforGeeks URLs below returned 200. LeetCode answers
automated requests with 403, so its URLs cannot be checked by a script; run
`python scripts/check_resource_links.py` from a normal network and open the LeetCode ones by hand.
"""
import re
from typing import Literal, TypedDict
from urllib.parse import quote, quote_plus

Topic = Literal["DSA", "OOP", "DBMS", "OS", "CN", "HR", "PROJECT"]
Source = Literal["GEEKSFORGEEKS", "LEETCODE"]
Kind = Literal["interview_experiences", "topic_guide", "practice", "discussion", "search"]
Scope = Literal["company", "topic"]

ALLOWED_HOSTS = ("www.geeksforgeeks.org", "leetcode.com")

GFG = "https://www.geeksforgeeks.org"
LC = "https://leetcode.com"

# LeetCode company pages exist for these; anything else gets the generic discussion search only.
LEETCODE_COMPANY_SLUG = {
    "google": "google", "amazon": "amazon", "microsoft": "microsoft", "meta": "facebook", "facebook": "facebook",
    "apple": "apple", "adobe": "adobe", "uber": "uber", "oracle": "oracle", "flipkart": "flipkart",
    "goldman sachs": "goldman-sachs", "infosys": "infosys", "tcs": "tcs", "wipro": "wipro",
    "cognizant": "cognizant", "accenture": "accenture",
}

# GeeksforGeeks topic hubs (final, canonical URLs).
GFG_TOPIC = {
    "DSA": ("Data structures and algorithms", f"{GFG}/dsa/dsa-tutorial-learn-data-structures-and-algorithms/"),
    "OOP": ("Object-oriented programming concepts", f"{GFG}/java/object-oriented-programming-oops-concept-in-java/"),
    "DBMS": ("Database management systems", f"{GFG}/dbms/dbms/"),
    "OS": ("Operating systems", f"{GFG}/operating-systems/operating-systems/"),
    "CN": ("Computer networks", f"{GFG}/computer-networks/computer-network-tutorials/"),
    "HR": ("HR interview questions", f"{GFG}/hr/hr-interview-questions/"),
}

# Topic search phrases, used for GeeksforGeeks search and for LeetCode discussion search.
SEARCH_PHRASE = {
    "DSA": "data structures and algorithms interview questions",
    "OOP": "oops interview questions",
    "DBMS": "dbms interview questions",
    "OS": "operating system interview questions",
    "CN": "computer networks interview questions",
    "HR": "hr interview questions",
    "PROJECT": "project interview questions",
}

# LeetCode tag pages for the DSA topic (slugs as LeetCode names them).
LEETCODE_DSA_TAGS = [
    ("Arrays", "array"), ("Strings", "string"), ("Hash tables", "hash-table"), ("Dynamic programming", "dynamic-programming"),
    ("Trees", "tree"), ("Graphs", "graph"), ("Binary search", "binary-search"), ("Linked lists", "linked-list"),
]
# Words a question's subtopic may contain -> a LeetCode tag slug, so a "dynamic programming" day links to that tag.
SUBTOPIC_TAG = {
    "array": "array", "string": "string", "hash": "hash-table", "dynamic programming": "dynamic-programming",
    "dp": "dynamic-programming", "tree": "tree", "graph": "graph", "binary search": "binary-search",
    "linked list": "linked-list", "stack": "stack", "greedy": "greedy", "backtracking": "backtracking",
    "recursion": "recursion", "sorting": "sorting", "heap": "heap-priority-queue", "bit": "bit-manipulation",
}

_SUFFIXES = {"inc", "ltd", "llc", "pvt", "private", "limited", "technologies", "technology", "corp", "corporation", "co"}


class Resource(TypedDict):
    id: str
    title: str
    description: str
    url: str
    source: Source
    kind: Kind
    scope: Scope


def clean_company(name: str | None) -> str:
    """Lowercase words only, no company-suffix noise: 'Google Inc.' -> 'google'."""
    words = re.findall(r"[a-z0-9]+", (name or "").lower())
    words = [w for w in words if w not in _SUFFIXES]
    return " ".join(words)[:60].strip()


def slug(text: str) -> str:
    return "-".join(re.findall(r"[a-z0-9]+", text.lower()))


def _r(rid: str, title: str, description: str, url: str, source: Source, kind: Kind, scope: Scope) -> Resource:
    host = url.split("/")[2]
    assert url.startswith("https://") and host in ALLOWED_HOSTS, url  # fixed hosts only
    return {"id": rid, "title": title, "description": description, "url": url, "source": source, "kind": kind, "scope": scope}


def _tag_for(subtopic: str | None) -> str | None:
    low = (subtopic or "").lower()
    for key, tag in SUBTOPIC_TAG.items():
        if re.search(rf"\b{re.escape(key)}", low):
            return tag
    return None


def company_resources(company: str | None) -> list[Resource]:
    c = clean_company(company)
    if not c:
        return []
    label = c.title()
    out = [
        _r("gfg-company-search", f"{label} interview experiences on GeeksforGeeks",
           "Search results for experiences people have shared about this company.",
           f"{GFG}/search/?q={quote_plus(c + ' interview experience')}", "GEEKSFORGEEKS", "search", "company"),
        _r("gfg-company-corner", "Company interview corner",
           "GeeksforGeeks' browse-by-company hub of interview experiences.",
           f"{GFG}/interview-experiences/company-interview-corner/", "GEEKSFORGEEKS", "interview_experiences", "company"),
        _r("lc-company-discuss", f"{label} interview experiences on LeetCode Discuss",
           "Threads where candidates describe their rounds. Opens LeetCode's own search.",
           f"{LC}/discuss/interview-experience?currentPage=1&orderBy=hot&query={quote(c)}", "LEETCODE", "discussion", "company"),
    ]
    lc_slug = LEETCODE_COMPANY_SLUG.get(c)
    if lc_slug:
        out.append(_r("lc-company-tag", f"{label} problems on LeetCode",
                      "LeetCode's company page. Some of its list may need a LeetCode Premium account.",
                      f"{LC}/company/{lc_slug}/", "LEETCODE", "practice", "company"))
    return out


def topic_resources(topic: Topic | None, subtopic: str | None = None) -> list[Resource]:
    if topic is None:
        return []
    out: list[Resource] = []
    if topic in GFG_TOPIC:
        title, url = GFG_TOPIC[topic]
        out.append(_r(f"gfg-topic-{topic.lower()}", f"{title} on GeeksforGeeks", "Tutorials and articles for this topic.", url, "GEEKSFORGEEKS", "topic_guide", "topic"))
    phrase = SEARCH_PHRASE[topic]
    out.append(_r(f"gfg-search-{topic.lower()}", "Interview questions on GeeksforGeeks", "Search results for commonly asked questions.",
                  f"{GFG}/search/?q={quote_plus(phrase)}", "GEEKSFORGEEKS", "search", "topic"))
    out.append(_r(f"lc-discuss-{topic.lower()}", "Related discussions on LeetCode Discuss", "Community threads. Opens LeetCode's own search.",
                  f"{LC}/discuss/interview-question?currentPage=1&orderBy=hot&query={quote(phrase)}", "LEETCODE", "discussion", "topic"))
    if topic == "DSA":
        tag = _tag_for(subtopic)
        tags = [(n, s) for n, s in LEETCODE_DSA_TAGS if s == tag] or LEETCODE_DSA_TAGS[:4]
        if tag and not any(s == tag for _, s in LEETCODE_DSA_TAGS):
            tags = [(tag.replace("-", " ").title(), tag)]
        for name, s in tags:
            out.append(_r(f"lc-tag-{s}", f"{name} problems on LeetCode", "Practice problems filtered by this topic tag.",
                          f"{LC}/tag/{s}/", "LEETCODE", "practice", "topic"))
        if tag == "dynamic-programming":
            out.append(_r("gfg-dp", "Dynamic programming on GeeksforGeeks", "Tutorial and problem set.",
                          f"{GFG}/dsa/dynamic-programming/", "GEEKSFORGEEKS", "topic_guide", "topic"))
    return out


def build_resources(company: str | None, topic: Topic | None, subtopic: str | None = None) -> dict:
    return {
        "company": clean_company(company) or None,
        "topic": topic,
        "company_resources": company_resources(company),
        "topic_resources": topic_resources(topic, subtopic),
        "note": (
            "These are links to third-party sites. We have not reviewed their content, "
            "and none of it is claimed to be what a particular company asks."
        ),
    }
