"""Competitive-programming platform connectors: LeetCode, CodeChef, Codeforces and HackerRank.

Each returns a `PlatformResult` in the same normalised shape the GitHub connector uses
(`metrics: {key: {value, available}}`) and raises `ConnectorError` with a stable code. Hosts are fixed
and usernames are validated, so a user can never make the server fetch an arbitrary URL.

Missing data is `available: False`, never 0 (Blueprint 14.2).
"""
import json
import re
import time
from dataclasses import dataclass, field
from typing import Any
from urllib.parse import quote

import httpx

from app.integrations.github import ConnectorError

USERNAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$")
TIMEOUT = 8.0
BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0 Safari/537.36"
)
HACKERRANK_BADGES = {
    "Problem Solving": "stars_problem_solving",
    "Java": "stars_java",
    "C++": "stars_cpp",
    "Python": "stars_python",
}


@dataclass
class PlatformResult:
    raw: dict[str, Any]
    normalized: dict[str, Any]
    repositories: list[dict[str, Any]] = field(default_factory=list)  # always empty; keeps GithubResult's shape


def _metric(value: Any) -> dict[str, Any]:
    if value is None:
        return {"value": None, "available": False}
    return {"value": value, "available": True}


def _check_username(username: str, platform: str) -> None:
    if not USERNAME_RE.match(username or ""):
        raise ConnectorError("INVALID_USERNAME", f"That is not a valid {platform} username.")


def _check(response: httpx.Response, name: str) -> None:
    if response.status_code == 404:
        raise ConnectorError("NOT_FOUND", f"That {name} username was not found.")
    if response.status_code == 429:
        raise ConnectorError("RATE_LIMITED", f"{name} rate limit reached. Try again later.")
    if response.status_code in (401, 403):
        raise ConnectorError("PLATFORM_UNAVAILABLE", f"{name} refused the request.")
    if response.status_code >= 500:
        raise ConnectorError("PLATFORM_UNAVAILABLE", f"{name} is not responding.")
    if response.status_code != 200:
        raise ConnectorError("PLATFORM_UNAVAILABLE", f"Unexpected response from {name}.")


def _guard(name: str, run, client: httpx.Client | None):
    owns = client is None
    http = client or httpx.Client(timeout=TIMEOUT, follow_redirects=True, headers={"User-Agent": BROWSER_UA})
    try:
        return run(http)
    except httpx.TimeoutException:
        raise ConnectorError("TIMEOUT", f"{name} took too long to respond.") from None
    except httpx.HTTPError:
        raise ConnectorError("PLATFORM_UNAVAILABLE", f"Could not reach {name}.") from None
    finally:
        if owns:
            http.close()


def _malformed(name: str) -> ConnectorError:
    return ConnectorError("MALFORMED_RESPONSE", f"{name} sent data we could not read. Enter your stats manually instead.")


def _int(value: Any) -> int | None:
    try:
        return int(round(float(value)))
    except (TypeError, ValueError):
        return None


# ---- LeetCode ---------------------------------------------------------------------------------------

LEETCODE_QUERY = """query userProfile($username: String!) {
  matchedUser(username: $username) {
    submitStats: submitStatsGlobal { acSubmissionNum { difficulty count } }
    userCalendar { streak totalActiveDays }
  }
  userContestRanking(username: $username) {
    attendedContestsCount rating globalRanking topPercentage badge { name }
  }
  userContestRankingHistory(username: $username) { attended rating }
}"""


def normalize_leetcode(username: str, data: dict[str, Any]) -> PlatformResult:
    user = data.get("matchedUser")
    if not user:
        raise ConnectorError("NOT_FOUND", "That LeetCode username was not found.")
    try:
        counts = {row["difficulty"]: int(row["count"]) for row in user["submitStats"]["acSubmissionNum"]}
    except (KeyError, TypeError, ValueError):
        raise _malformed("LeetCode") from None
    contest = data.get("userContestRanking") or None
    history = data.get("userContestRankingHistory") or []
    calendar = user.get("userCalendar") or None

    current = _int(contest.get("rating")) if contest else None
    attended = [float(h["rating"]) for h in history if isinstance(h, dict) and h.get("attended") and h.get("rating") is not None]
    peak = _int(max(attended)) if attended else current
    if peak is not None and current is not None:
        peak = max(peak, current)
    badge = ((contest or {}).get("badge") or {}).get("name")
    top = (contest or {}).get("topPercentage")

    metrics = {
        "problems_solved_total": _metric(counts.get("All")),
        "problems_easy": _metric(counts.get("Easy")),
        "problems_medium": _metric(counts.get("Medium")),
        "problems_hard": _metric(counts.get("Hard")),
        "rating_current": _metric(current),
        "rating_peak": _metric(peak),
        "contests_count": _metric(_int(contest.get("attendedContestsCount")) if contest else None),
        "streak_current": _metric(_int(calendar.get("streak")) if calendar else None),
        # The API's own badge name ("Knight", "Guardian"...). Tiers are never computed here.
        "rating_badge": _metric(str(badge) if badge else None),
        "top_percentage": _metric(round(float(top), 2) if top is not None else None),
        "global_rank": _metric(_int(contest.get("globalRanking")) if contest else None),
    }
    warnings = [] if contest else ["No contest data: this account has not joined a rated LeetCode contest."]
    return PlatformResult(
        raw={"contest_entries": len(history)},
        normalized={
            "platform": "LEETCODE",
            "username": username,
            "profile_url": f"https://leetcode.com/u/{username}/",
            "metrics": metrics,
            "warnings": warnings,
        },
    )


def fetch_leetcode(username: str, client: httpx.Client | None = None) -> PlatformResult:
    _check_username(username, "LeetCode")

    def run(http: httpx.Client) -> PlatformResult:
        response = http.post(
            "https://leetcode.com/graphql",
            json={"query": LEETCODE_QUERY, "variables": {"username": username}},
            headers={"Referer": f"https://leetcode.com/u/{quote(username)}/", "Content-Type": "application/json", "User-Agent": BROWSER_UA},
        )
        if response.status_code == 400:  # LeetCode answers some unknown users with a GraphQL 400
            raise ConnectorError("NOT_FOUND", "That LeetCode username was not found.")
        _check(response, "LeetCode")
        try:
            body = response.json()
        except ValueError:
            raise _malformed("LeetCode") from None
        if not isinstance(body, dict) or not isinstance(body.get("data"), dict):
            raise _malformed("LeetCode")
        return normalize_leetcode(username, body["data"])

    return _guard("LeetCode", run, client)


# ---- CodeChef ---------------------------------------------------------------------------------------

_CC_RATING = re.compile(r'<div class="rating-number">\s*([^<]*?)\s*</div>')
_CC_STAR_BLOCK = re.compile(r'<div class="rating-star">(.*?)</div>', re.S)
_CC_HIGHEST = re.compile(r"Highest Rating\s*(\d+)")
_CC_SOLVED = re.compile(r"Total Problems Solved:\s*(\d+)")
_CC_CONTESTS = re.compile(r"Contests Participated:\s*<b>\s*(\d+)\s*</b>")
_CC_RANK_BLOCK = re.compile(r'<div class="rating-ranks">(.*?)</ul>', re.S)
_CC_RANK = re.compile(r"<strong>\s*([^<]*?)\s*</strong>\s*</a>\s*(Global|Country) Rank", re.S)
_CC_HISTORY = re.compile(r"var all_rating = (\[.*?\]);", re.S)


def parse_codechef(username: str, html: str) -> PlatformResult:
    rating_m = _CC_RATING.search(html)
    solved_m = _CC_SOLVED.search(html)
    if rating_m is None and solved_m is None:
        raise _malformed("CodeChef")

    rating = int(rating_m.group(1)) if rating_m and rating_m.group(1).isdigit() else None
    star_m = _CC_STAR_BLOCK.search(html)
    stars = star_m.group(1).count("&#9733;") if star_m else None
    highest = _CC_HIGHEST.search(html)
    contests = _CC_CONTESTS.search(html)

    ranks: dict[str, int | None] = {"Global": None, "Country": None}
    block = _CC_RANK_BLOCK.search(html)
    if block:
        for value, kind in _CC_RANK.findall(block.group(1)):
            ranks[kind] = int(value.replace(",", "")) if value.replace(",", "").isdigit() else None  # "Inactive"

    best_contest_rank = None
    history = _CC_HISTORY.search(html)
    if history:
        try:
            found = [int(c["rank"]) for c in json.loads(history.group(1)) if str(c.get("rank", "")).isdigit()]
            best_contest_rank = min(found) if found else None
        except (ValueError, TypeError, KeyError, AttributeError):
            best_contest_rank = None

    metrics = {
        "rating_current": _metric(rating),
        "rating_peak": _metric(int(highest.group(1)) if highest else None),
        "stars": _metric(stars if stars else None),
        "problems_solved_total": _metric(int(solved_m.group(1)) if solved_m else None),
        "contests_count": _metric(int(contests.group(1)) if contests else None),
        "global_rank": _metric(ranks["Global"]),
        "country_rank": _metric(ranks["Country"]),
        "best_contest_rank": _metric(best_contest_rank),
    }
    return PlatformResult(
        raw={"source": "public profile page"},
        normalized={
            "platform": "CODECHEF",
            "username": username,
            "profile_url": f"https://www.codechef.com/users/{username}",
            "metrics": metrics,
            "warnings": [],
        },
    )


def fetch_codechef(username: str, client: httpx.Client | None = None) -> PlatformResult:
    _check_username(username, "CodeChef")

    def run(http: httpx.Client) -> PlatformResult:
        response = http.get(f"https://www.codechef.com/users/{quote(username)}", headers={"User-Agent": BROWSER_UA})
        _check(response, "CodeChef")
        if not response.url.path.startswith("/users/"):  # unknown users are redirected away from /users/
            raise ConnectorError("NOT_FOUND", "That CodeChef username was not found.")
        return parse_codechef(username, response.text)

    return _guard("CodeChef", run, client)


# ---- Codeforces -------------------------------------------------------------------------------------
# Official public API (no key): user.info, user.rating and user.status. https://codeforces.com/apiHelp

CF_API = "https://codeforces.com/api"
CF_STATUS_TIMEOUT = 20.0  # user.status lists every submission, so it can be large for active users
CF_PAUSE = 2.1  # Codeforces allows one API call per 2 seconds per IP; faster calls get "Call limit exceeded"


def normalize_codeforces(username: str, info: dict[str, Any], rating_changes: list[Any] | None,
                         submissions: list[Any] | None) -> PlatformResult:
    if not isinstance(info, dict) or not info.get("handle"):
        raise _malformed("Codeforces")
    handle = str(info["handle"])
    rated = "rating" in info  # unrated accounts have no rating, maxRating or rank fields at all
    solved = None
    if isinstance(submissions, list):
        keys = set()
        for sub in submissions:
            if isinstance(sub, dict) and sub.get("verdict") == "OK" and isinstance(sub.get("problem"), dict):
                prob = sub["problem"]
                keys.add((prob.get("contestId") or prob.get("problemsetName"), prob.get("index"), prob.get("name")))
        solved = len(keys)
    metrics = {
        "rank": _metric(str(info["rank"]).title() if rated and info.get("rank") else None),
        "rating_current": _metric(_int(info.get("rating")) if rated else None),
        "rating_max": _metric(_int(info.get("maxRating")) if rated else None),
        "max_rank": _metric(str(info["maxRank"]).title() if rated and info.get("maxRank") else None),
        "contests_count": _metric(len(rating_changes) if isinstance(rating_changes, list) else None),
        "problems_solved_total": _metric(solved),
    }
    warnings = [] if rated else ["Unrated: this account has not taken part in a rated Codeforces contest yet."]
    return PlatformResult(
        raw={"source": "codeforces api"},
        normalized={
            "platform": "CODEFORCES",
            "username": handle,
            "profile_url": f"https://codeforces.com/profile/{handle}",
            "metrics": metrics,
            "warnings": warnings,
        },
    )


def _cf_call(http: httpx.Client, method: str, params: dict[str, Any], timeout: float = TIMEOUT) -> Any:
    # lang=en: without it Codeforces may answer in Russian (e.g. the rank names)
    response = http.get(f"{CF_API}/{method}", params={**params, "lang": "en"}, timeout=timeout)
    if response.status_code == 400:  # Codeforces answers 400 + {"status": "FAILED"} for unknown handles
        try:
            comment = str(response.json().get("comment", ""))
        except ValueError:
            comment = ""
        if "not found" in comment.lower():
            raise ConnectorError("NOT_FOUND", "That Codeforces username was not found.")
    if response.status_code == 503:
        raise ConnectorError("RATE_LIMITED", "Codeforces rate limit reached. Try again later.")
    _check(response, "Codeforces")
    try:
        body = response.json()
    except ValueError:
        raise _malformed("Codeforces") from None
    if not isinstance(body, dict) or body.get("status") != "OK":
        raise _malformed("Codeforces")
    return body.get("result")


def fetch_codeforces(username: str, client: httpx.Client | None = None) -> PlatformResult:
    _check_username(username, "Codeforces")

    def run(http: httpx.Client) -> PlatformResult:
        users = _cf_call(http, "user.info", {"handles": username})
        if not isinstance(users, list) or not users:
            raise ConnectorError("NOT_FOUND", "That Codeforces username was not found.")
        handle = users[0].get("handle", username) if isinstance(users[0], dict) else username
        # The profile itself is required; contests and solved count are extras that may fail on their own.
        time.sleep(CF_PAUSE)
        try:
            changes = _cf_call(http, "user.rating", {"handle": handle})
        except ConnectorError:
            changes = None
        time.sleep(CF_PAUSE)
        try:
            subs = _cf_call(http, "user.status", {"handle": handle}, timeout=CF_STATUS_TIMEOUT)
        except (ConnectorError, httpx.TimeoutException):
            subs = None
        return normalize_codeforces(username, users[0], changes, subs)

    return _guard("Codeforces", run, client)


# ---- HackerRank -------------------------------------------------------------------------------------

def normalize_hackerrank(username: str, body: dict[str, Any]) -> PlatformResult:
    models = body.get("models")
    if body.get("status") is not True or not isinstance(models, list):
        raise ConnectorError("NOT_FOUND", "That HackerRank username was not found.")
    stars: dict[str, int] = {}
    for badge in models:
        if isinstance(badge, dict) and badge.get("badge_name") in HACKERRANK_BADGES and isinstance(badge.get("stars"), int):
            stars[HACKERRANK_BADGES[badge["badge_name"]]] = badge["stars"]
    metrics = {key: _metric(stars.get(key)) for key in HACKERRANK_BADGES.values()}
    warnings = [] if stars else ["No star badges found for Problem Solving, Java, C++ or Python on this profile."]
    return PlatformResult(
        raw={"badge_count": len(models)},
        normalized={
            "platform": "HACKERRANK",
            "username": username,
            "profile_url": f"https://www.hackerrank.com/profile/{username}",
            "metrics": metrics,
            "warnings": warnings,
        },
    )


def fetch_hackerrank(username: str, client: httpx.Client | None = None) -> PlatformResult:
    _check_username(username, "HackerRank")

    def run(http: httpx.Client) -> PlatformResult:
        response = http.get(f"https://www.hackerrank.com/rest/hackers/{quote(username)}/badges", headers={"User-Agent": BROWSER_UA})
        _check(response, "HackerRank")
        try:
            body = response.json()
        except ValueError:
            raise _malformed("HackerRank") from None
        if not isinstance(body, dict):
            raise _malformed("HackerRank")
        return normalize_hackerrank(username, body)

    return _guard("HackerRank", run, client)


# ---- dispatch ---------------------------------------------------------------------------------------

FETCHERS = {"LEETCODE": fetch_leetcode, "CODECHEF": fetch_codechef, "CODEFORCES": fetch_codeforces,
            "HACKERRANK": fetch_hackerrank}


def fetch(platform: str, username: str) -> PlatformResult:
    """The default fetcher the API uses. Tests replace it so nothing reaches the network."""
    connector = FETCHERS.get(platform)
    if connector is None:
        raise ConnectorError("UNSUPPORTED_PLATFORM", f"{platform} has no live connector.")
    return connector(username)
