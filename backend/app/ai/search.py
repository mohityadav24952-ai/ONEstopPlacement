"""Web search for "Ask Placey" (Tavily). Called ONLY from the Ask Placey endpoint, never on page loads.

A failure never breaks the feature: the caller catches SearchError and answers without web results,
saying so. Nothing from a search result is trusted: it is passed to the model inside the <data>
block like any other untrusted text.
"""
import logging
from typing import Protocol, TypedDict

import httpx

from app.core.config import Settings, get_settings

logger = logging.getLogger("app.ai")
API_URL = "https://api.tavily.com/search"
MAX_SNIPPET = 600


class SearchResult(TypedDict):
    title: str
    url: str
    snippet: str


class SearchError(Exception):
    """The search could not be done (network, bad key, quota). The message holds a category only."""


class SearchClient(Protocol):
    configured: bool

    def search(self, query: str, max_results: int = 5) -> list[SearchResult]: ...


class NoSearch:
    configured = False

    def search(self, query: str, max_results: int = 5) -> list[SearchResult]:
        return []


class TavilySearch:
    configured = True

    def __init__(self, api_key: str, timeout: int = 15, transport: httpx.BaseTransport | None = None) -> None:
        self.api_key, self.timeout, self.transport = api_key, timeout, transport

    def search(self, query: str, max_results: int = 5) -> list[SearchResult]:
        try:
            with httpx.Client(timeout=self.timeout, transport=self.transport) as client:
                r = client.post(
                    API_URL,
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={"query": query[:300], "max_results": max_results, "search_depth": "basic", "include_answer": False},
                )
        except httpx.HTTPError as exc:
            logger.warning("Tavily request failed: %s", type(exc).__name__)  # category only
            raise SearchError("NETWORK") from exc
        if r.status_code != 200:
            logger.warning("Tavily returned HTTP %s", r.status_code)
            raise SearchError(f"HTTP_{r.status_code}")
        try:
            items = r.json().get("results", [])
        except ValueError as exc:
            raise SearchError("BAD_JSON") from exc
        out: list[SearchResult] = []
        for item in items:
            url = str(item.get("url", ""))
            if not url.startswith(("http://", "https://")):
                continue  # never pass on or link to anything but web pages
            out.append({"title": str(item.get("title", ""))[:140] or url, "url": url, "snippet": str(item.get("content", ""))[:MAX_SNIPPET]})
            if len(out) == max_results:
                break
        return out


def build_search(settings: Settings) -> SearchClient:
    if settings.tavily_api_key:
        return TavilySearch(settings.tavily_api_key, settings.placey_search_timeout)
    return NoSearch()


def get_search_client() -> SearchClient:
    """FastAPI dependency. Tests override it."""
    return build_search(get_settings())
