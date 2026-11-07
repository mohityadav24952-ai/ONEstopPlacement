"""GitHub public-data connector. Maps GitHub's payloads to the normalised model."""
import re
from dataclasses import dataclass, field
from typing import Any

import httpx

from app.integrations import github_cache

API = "https://api.github.com"
PER_PAGE = 100
README_REPOS = 25  # READMEs are fetched for the most recently pushed project repositories only
README_MAX_CHARS = 6000
MAX_PAGES = 10  # up to 1000 repositories; beyond that the user is told the list is partial
USERNAME_RE = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$")


class ConnectorError(Exception):
    """A platform problem with a stable code the API can translate for the user."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass
class GithubResult:
    raw: dict[str, Any]
    normalized: dict[str, Any]
    repositories: list[dict[str, Any]] = field(default_factory=list)


def _metric(value: Any) -> dict[str, Any]:
    # Missing data is "not available", never 0 (Blueprint 14.2).
    if value is None:
        return {"value": None, "available": False}
    return {"value": value, "available": True}


def _is_project(repo: dict[str, Any], login: str) -> bool:
    """Real project repositories only: not private, not a fork, and not the `<login>/<login>` profile README."""
    if repo.get("private") or repo.get("fork"):
        return False
    return str(repo.get("full_name", "")).lower() != f"{login}/{login}".lower()


def normalize(user: dict[str, Any], repos: list[dict[str, Any]]) -> GithubResult:
    projects = [r for r in repos if _is_project(r, user["login"])]
    languages: dict[str, int] = {}
    for r in projects:
        if r.get("language"):
            languages[r["language"]] = languages.get(r["language"], 0) + 1
    normalized = {
        "platform": "GITHUB",
        "username": user["login"],
        "profile_url": user.get("html_url") or f"https://github.com/{user['login']}",
        # Followers, stars on other people's repos and similar vanity numbers are deliberately not fetched.
        "metrics": {"project_repos": _metric(len(projects))},
        "languages": dict(sorted(languages.items(), key=lambda kv: -kv[1])),
        "warnings": [],
    }
    if len(repos) < (user.get("public_repos") or 0):
        normalized["warnings"].append(
            f"Loaded {len(repos)} of {user.get('public_repos')} public repositories."
        )
    normalized["repository_count"] = len(repos)
    repositories = [
        {
            "external_id": str(r["id"]),
            "full_name": r["full_name"],
            "description": r.get("description"),
            "url": r["html_url"],
            "language": r.get("language"),
            "stars": r.get("stargazers_count", 0),
            "topics": r.get("topics") or [],
            "pushed_at": r.get("pushed_at"),
            "is_fork": bool(r.get("fork")),
            "is_archived": bool(r.get("archived")),
        }
        for r in projects
    ]
    return GithubResult(
        raw={"user": user, "repo_count": len(repos)},
        normalized=normalized,
        repositories=repositories,
    )


def _check(response: httpx.Response) -> dict | list:
    if response.status_code == 404:
        raise ConnectorError("NOT_FOUND", "That GitHub username was not found.")
    if response.status_code in (403, 429):
        if response.headers.get("x-ratelimit-remaining") == "0" or response.status_code == 429:
            raise ConnectorError("RATE_LIMITED", "GitHub rate limit reached. Try again later.")
        raise ConnectorError("PLATFORM_UNAVAILABLE", "GitHub refused the request.")
    if response.status_code >= 500:
        raise ConnectorError("PLATFORM_UNAVAILABLE", "GitHub is not responding.")
    if response.status_code != 200:
        raise ConnectorError("PLATFORM_UNAVAILABLE", "Unexpected response from GitHub.")
    try:
        return response.json()
    except ValueError:
        raise ConnectorError(
            "MALFORMED_RESPONSE", "GitHub sent data we could not read."
        ) from None


def attach_readmes(http: httpx.Client, repositories: list[dict[str, Any]]) -> None:
    """Adds `readme` (raw text, capped) to the most recently pushed repositories. A repo without a README,
    or any per-repo failure, is skipped; hitting GitHub's rate limit stops the rest."""
    recent = sorted(repositories, key=lambda r: r.get("pushed_at") or "", reverse=True)[:README_REPOS]
    for repo in recent:
        try:
            response = http.get(
                f"{API}/repos/{repo['full_name']}/readme",
                headers={"Accept": "application/vnd.github.raw+json"},
            )
        except httpx.HTTPError:
            continue
        if response.status_code in (403, 429):
            break
        if response.status_code == 200 and response.text.strip():
            repo["readme"] = response.text.replace("\x00", "")[:README_MAX_CHARS]


def fetch(username: str, token: str = "", client: httpx.Client | None = None) -> GithubResult:
    """Cached for an hour (see github_cache). If GitHub rate limits us, an older cached copy is served
    with a warning instead of failing."""
    if not USERNAME_RE.match(username):
        raise ConnectorError("INVALID_USERNAME", "That is not a valid GitHub username.")
    cached = github_cache.get("result", username)
    if cached is not None:
        return cached
    try:
        result = _fetch_live(username, token, client)
    except ConnectorError as exc:
        if exc.code == "RATE_LIMITED":
            stale = github_cache.get("result", username, allow_stale=True)
            if stale is not None:
                stale.normalized.setdefault("warnings", []).append(
                    "GitHub is rate limiting requests right now, so your last fetched data is shown."
                )
                return stale
        raise
    github_cache.put("result", username, result)
    return result


def _fetch_live(username: str, token: str, client: httpx.Client | None) -> GithubResult:
    headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    owns_client = client is None
    http = client or httpx.Client(timeout=8.0, headers=headers)
    try:
        user = _check(http.get(f"{API}/users/{username}"))
        if not isinstance(user, dict) or "login" not in user:
            raise ConnectorError("MALFORMED_RESPONSE", "GitHub sent data we could not read.")
        repos: list = []
        for page in range(1, MAX_PAGES + 1):
            chunk = _check(
                http.get(
                    f"{API}/users/{username}/repos",
                    params={"per_page": PER_PAGE, "page": page, "sort": "pushed", "type": "owner"},
                )
            )
            if not isinstance(chunk, list):
                raise ConnectorError("MALFORMED_RESPONSE", "GitHub sent data we could not read.")
            repos.extend(chunk)
            if len(chunk) < PER_PAGE:
                break
        github_cache.put("raw", username, {"user": user, "repos": repos})  # reused by portfolio enrichment
        try:
            result = normalize(user, repos)
        except (KeyError, TypeError):
            raise ConnectorError(
                "MALFORMED_RESPONSE", "GitHub sent data we could not read."
            ) from None
        attach_readmes(http, result.repositories)
        return result
    except httpx.TimeoutException:
        raise ConnectorError("TIMEOUT", "GitHub took too long to respond.") from None
    except httpx.HTTPError:
        raise ConnectorError("PLATFORM_UNAVAILABLE", "Could not reach GitHub.") from None
    finally:
        if owns_client:
            http.close()
