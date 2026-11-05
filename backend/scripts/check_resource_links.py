"""Check every link the Interview Prep resources feature can generate.

    cd backend
    .venv\\Scripts\\python.exe scripts/check_resource_links.py

GeeksforGeeks links should all report 200 (redirects are followed). LeetCode answers scripted
requests with 403 (bot protection), so those are listed for you to open in a browser instead.
Exit code is 1 only if a GeeksforGeeks link is genuinely broken (404/5xx or unreachable).
"""
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.modules.interview import resources as R  # noqa: E402

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
COMPANIES = ["Google", "Amazon", "Meta", "TCS", "Goldman Sachs", "Zebra Widgets"]


def all_urls() -> dict[str, str]:
    urls: dict[str, str] = {}
    for company in COMPANIES:
        for r in R.company_resources(company):
            urls[r["url"]] = r["source"]
    for topic in R.SEARCH_PHRASE:
        for sub in (None, "dynamic programming", "graph", "backtracking"):
            for r in R.topic_resources(topic, sub):  # type: ignore[arg-type]
                urls[r["url"]] = r["source"]
    return urls


def main() -> int:
    urls = all_urls()
    broken: list[str] = []
    by_hand: list[str] = []
    with httpx.Client(headers={"User-Agent": UA}, follow_redirects=True, timeout=20) as client:
        for url, source in sorted(urls.items()):
            try:
                status = client.get(url).status_code
            except httpx.HTTPError as exc:
                status = f"ERR {type(exc).__name__}"
            if source == "LEETCODE" and status in (403, 429):
                by_hand.append(url)
                print(f"BY HAND  {status}  {url}")
            elif status == 200:
                print(f"OK       200  {url}")
            else:
                broken.append(url)
                print(f"BROKEN   {status}  {url}")
    print(f"\n{len(urls)} links: {len(urls) - len(broken) - len(by_hand)} ok, {len(by_hand)} to open by hand (LeetCode), {len(broken)} broken")
    return 1 if broken else 0


if __name__ == "__main__":
    raise SystemExit(main())
