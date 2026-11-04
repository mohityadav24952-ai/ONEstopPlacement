"""GitHub public-data connector. Maps GitHub's payloads to the normalised model."""
import re
from dataclasses import dataclass, field
from typing import Any

import httpx

API = "https://api.github.com"
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


def normalize(user: dict[str, Any], repos: list[dict[str, Any]]) -> GithubResult:
    owned = [r for r in repos if not r.get("fork")]
    languages: dict[str, int] = {}
    for r in owned:
        if r.get("language"):
            languages[r["language"]] = languages.get(r["language"], 0) + 1
    pushed = [r["pushed_at"] for r in owned if r.get("pushed_at")]
    normalized = {
        "platform": "GITHUB",
        "username": user["login"],
        "profile_url": user.get("html_url") or f"https://github.com/{user['login']}",
        "metrics": {
            "public_repos": _metric(user.get("public_repos")),
            "followers": _metric(user.get("followers")),
            "stars_received": _metric(sum(r.get("stargazers_count", 0) for r in owned)),
            "last_push": _metric(max(pushed) if pushed else None),
        },
        "languages": dict(sorted(languages.items(), key=lambda kv: -kv[1])),
        "warnings": [
            "Contribution calendar is not available from the public REST API."
        ],
    }
    if len(repos) < (user.get("public_repos") or 0):
        normalized["warnings"].append(
            f"Showing the {len(repos)} most recently updated repositories."
        )
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
        }
        for r in repos
        if not r.get("private") and not r.get("archived")
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


def fetch(username: str, token: str = "", client: httpx.Client | None = None) -> GithubResult:
    if not USERNAME_RE.match(username):
        raise ConnectorError("INVALID_USERNAME", "That is not a valid GitHub username.")
    headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    owns_client = client is None
    http = client or httpx.Client(timeout=8.0, headers=headers)
    try:
        user = _check(http.get(f"{API}/users/{username}"))
        repos = _check(
            http.get(
                f"{API}/users/{username}/repos",
                params={"per_page": 100, "sort": "pushed", "type": "owner"},
            )
        )
        if not isinstance(user, dict) or "login" not in user or not isinstance(repos, list):
            raise ConnectorError("MALFORMED_RESPONSE", "GitHub sent data we could not read.")
        try:
            return normalize(user, repos)
        except (KeyError, TypeError):
            raise ConnectorError(
                "MALFORMED_RESPONSE", "GitHub sent data we could not read."
            ) from None
    except httpx.TimeoutException:
        raise ConnectorError("TIMEOUT", "GitHub took too long to respond.") from None
    except httpx.HTTPError:
        raise ConnectorError("PLATFORM_UNAVAILABLE", "Could not reach GitHub.") from None
    finally:
        if owns_client:
            http.close()
