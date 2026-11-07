"""Live coding-profile and project enrichment.

Every fetcher returns None on ANY problem (slow, rate limited, renamed, bad username) and never raises:
a third-party outage must not break saving a portfolio. Hosts are fixed and usernames are validated,
so a user can never make the server fetch an arbitrary URL (no SSRF).
"""
import asyncio
import re
import urllib.parse
from typing import Any

import httpx

from app.core.config import get_settings
from app.integrations import github_cache

TIMEOUT = 6.0
_USERNAME = re.compile(r"^[A-Za-z0-9_.-]{1,40}$")
_BROWSER_UA = "Mozilla/5.0 (compatible; ONEstopPlacementBot/1.0; +portfolio-enrichment)"


def valid_username(value: str | None) -> str | None:
    value = (value or "").strip()
    return value if _USERNAME.match(value) else None


def make_client() -> httpx.AsyncClient:
    """Tests replace this with a client on a mock transport."""
    return httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=True, headers={"User-Agent": _BROWSER_UA})


async def fetch_leetcode_stats(client: httpx.AsyncClient, username: str) -> dict[str, Any] | None:
    query = """query userPublicProfile($username: String!) {
      matchedUser(username: $username) { submitStats: submitStatsGlobal { acSubmissionNum { difficulty count } } }
      userContestRanking(username: $username) { rating globalRanking topPercentage }
    }"""
    try:
        r = await client.post(
            "https://leetcode.com/graphql",
            json={"query": query, "variables": {"username": username}},
            headers={"Referer": f"https://leetcode.com/u/{username}/", "Content-Type": "application/json"},
        )
        r.raise_for_status()
        data = r.json().get("data") or {}
        user = data.get("matchedUser")
        if not user:
            return None
        counts = {row["difficulty"]: int(row["count"]) for row in user["submitStats"]["acSubmissionNum"]}
        contest = data.get("userContestRanking") or {}
        out: dict[str, Any] = {
            "username": username,
            "profileUrl": f"https://leetcode.com/u/{username}/",
            "totalSolved": counts.get("All", 0),
            "easySolved": counts.get("Easy", 0),
            "mediumSolved": counts.get("Medium", 0),
            "hardSolved": counts.get("Hard", 0),
        }
        if contest.get("rating") is not None:
            out["rating"] = round(float(contest["rating"]), 1)
        if contest.get("globalRanking") is not None:
            out["globalRank"] = int(contest["globalRanking"])
        if contest.get("topPercentage") is not None:
            out["topPercentage"] = round(float(contest["topPercentage"]), 2)
        return out
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        return None


async def fetch_github_stats(client: httpx.AsyncClient, username: str) -> tuple[dict[str, Any], dict[str, dict]] | None:
    """Returns (stats, repos-by-lowercase-name) or None.

    Uses the shared 1-hour GitHub cache first (filled by the Coding module or an earlier sync), so moving
    between modules does not spend GitHub's rate limit again. On a rate-limit response an older cached
    copy is used if there is one."""
    headers = {"Accept": "application/vnd.github+json"}
    token = get_settings().github_token
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        cached = github_cache.get("raw", username)
        if cached is not None:
            user, repos = cached["user"], cached["repos"]
        else:
            user_r, repos_r = await asyncio.gather(
                client.get(f"https://api.github.com/users/{username}", headers=headers),
                client.get(f"https://api.github.com/users/{username}/repos?per_page=100&sort=updated", headers=headers),
            )
            stale = None
            if user_r.status_code in (403, 429) or repos_r.status_code in (403, 429):
                stale = github_cache.get("raw", username, allow_stale=True)
            if stale is not None:
                user, repos = stale["user"], stale["repos"]
            else:
                user_r.raise_for_status()
                repos_r.raise_for_status()
                user = user_r.json()
                repos = repos_r.json()
                if not isinstance(user, dict) or not isinstance(repos, list):
                    return None
                github_cache.put("raw", username, {"user": user, "repos": repos})
        repos = [r for r in repos if isinstance(r, dict)]
        langs: dict[str, int] = {}
        for repo in repos:
            if repo.get("language"):
                langs[repo["language"]] = langs.get(repo["language"], 0) + 1
        top = [name for name, _ in sorted(langs.items(), key=lambda kv: (-kv[1], kv[0]))[:5]]
        stats: dict[str, Any] = {
            "username": username,
            "profileUrl": user.get("html_url") or f"https://github.com/{username}",
            "publicRepos": int(user.get("public_repos", len(repos))),
            "followers": int(user.get("followers", 0)),
            "totalStars": sum(int(r.get("stargazers_count", 0)) for r in repos),
            "topLanguages": top,
        }
        if user.get("avatar_url"):
            stats["avatarUrl"] = user["avatar_url"]
        by_name = {
            str(r["name"]).lower(): {
                "description": r.get("description"),
                "html_url": r.get("html_url"),
                "homepage": r.get("homepage"),
                "stargazers_count": r.get("stargazers_count", 0),
            }
            for r in repos
            if r.get("name")
        }
        return stats, by_name
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        return None


async def fetch_codeforces_stats(client: httpx.AsyncClient, username: str) -> dict[str, Any] | None:
    try:
        r = await client.get("https://codeforces.com/api/user.info", params={"handles": username})
        r.raise_for_status()
        body = r.json()
        if body.get("status") != "OK":
            return None
        u = body["result"][0]
        return {
            "username": username,
            "profileUrl": f"https://codeforces.com/profile/{username}",
            "rating": int(u.get("rating", 0)),
            "maxRating": int(u.get("maxRating", u.get("rating", 0))),
            "rank": str(u.get("rank", "")).title(),
        }
    except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError):
        return None


def _stars_for(rating: int) -> str:
    # CodeChef's published star bands.
    for floor, stars in ((2500, 7), (2200, 6), (2000, 5), (1800, 4), (1600, 3), (1400, 2)):
        if rating >= floor:
            return f"{stars}★"
    return "1★"


async def fetch_codechef_stats(client: httpx.AsyncClient, username: str) -> dict[str, Any] | None:
    """CodeChef has no public JSON API, so this reads the public profile HTML. It is best-effort and
    returns None if the page layout changes."""
    try:
        r = await client.get(f"https://www.codechef.com/users/{username}")
        r.raise_for_status()
        html = r.text
        m = re.search(r"rating-number[^>]*>\s*(\d{3,4})", html)
        if not m:
            return None
        rating = int(m.group(1))
        hi = re.search(r"Highest Rating\s*(\d{3,4})", html)
        star = re.search(r"rating-star[^>]*>(.*?)</div>", html, re.S)
        star_count = star.group(1).count("★") if star else 0
        rank = re.search(r"Global Rank[^0-9]{0,80}?(\d[\d,]*)", html, re.S)
        out: dict[str, Any] = {
            "username": username,
            "profileUrl": f"https://www.codechef.com/users/{username}",
            "rating": rating,
            "maxRating": max(rating, int(hi.group(1))) if hi else rating,
            "stars": f"{star_count}★" if star_count else _stars_for(rating),
        }
        if rank:
            out["globalRank"] = int(rank.group(1).replace(",", ""))
        return out
    except (httpx.HTTPError, ValueError):
        return None


_GH_REPO = re.compile(r"^https?://(?:www\.)?github\.com/([^/\s]+)/([^/\s#?]+)", re.I)


def enrich_project_screenshots(projects: list[dict[str, Any]], repos: dict[str, dict] | None = None) -> list[dict[str, Any]]:
    """Fills gaps only: a custom imageUrl, description or liveUrl the user wrote is never overwritten."""
    repos = repos or {}
    for p in projects:
        gh = _GH_REPO.match(p.get("githubUrl") or "")
        repo = repos.get(gh.group(2).removesuffix(".git").lower()) if gh else None
        if repo:
            if not p.get("description") and repo.get("description"):
                p["description"] = repo["description"]
            home = (repo.get("homepage") or "").strip()
            if not p.get("liveUrl") and home.lower().startswith(("http://", "https://")):
                p["liveUrl"] = home
        if p.get("imageUrl"):
            continue
        if p.get("liveUrl"):
            q = urllib.parse.quote(p["liveUrl"], safe="")
            p["imageUrl"] = f"https://api.microlink.io/?url={q}&screenshot=true&meta=false&embed=screenshot.url"
        elif gh:
            p["imageUrl"] = f"https://opengraph.githubassets.com/1/{gh.group(1)}/{gh.group(2).removesuffix('.git')}"
    return projects


async def enrich_portfolio(data: dict[str, Any], handles: dict[str, str | None]) -> tuple[dict[str, Any], list[str]]:
    """Updates `data` (camelCase dict) in place and returns it with plain-language warnings."""
    warnings: list[str] = []
    wanted = {k: valid_username(v) for k, v in handles.items()}
    for k, v in handles.items():
        if v and not wanted[k]:
            warnings.append(f"The {k} username has characters that are not allowed, so it was skipped.")
    stats = data.setdefault("codingStats", {})
    repos: dict[str, dict] = {}

    async with make_client() as client:
        jobs: dict[str, Any] = {}
        if wanted.get("leetcode"):
            jobs["leetcode"] = fetch_leetcode_stats(client, wanted["leetcode"])
        if wanted.get("github"):
            jobs["github"] = fetch_github_stats(client, wanted["github"])
        if wanted.get("codeforces"):
            jobs["codeforces"] = fetch_codeforces_stats(client, wanted["codeforces"])
        if wanted.get("codechef"):
            jobs["codechef"] = fetch_codechef_stats(client, wanted["codechef"])
        results = dict(zip(jobs, await asyncio.gather(*jobs.values()))) if jobs else {}

    for name, result in results.items():
        if result is None:
            warnings.append(f"Could not fetch {name} stats for '{wanted[name]}' right now. Existing values were kept.")
        elif name == "github":
            stats["github"], repos = result
        else:
            stats[name] = result
    enrich_project_screenshots(data.get("projects", []), repos)
    return data, warnings
