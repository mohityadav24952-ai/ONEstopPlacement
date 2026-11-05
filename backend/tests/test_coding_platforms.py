"""LeetCode, CodeChef, HackerRank connectors and GitHub README fetching. No test touches the network."""
import datetime as dt

import httpx
import pytest

from app.integrations import github, platforms
from app.integrations.github import ConnectorError
from app.modules.coding import service
from app.modules.coding.router import get_cooldown, get_github_fetcher, get_platform_fetcher


def _client(handler):
    return httpx.Client(transport=httpx.MockTransport(handler), follow_redirects=True)


# ---- LeetCode -----------------------------------------------------------------------------------------

LC_DATA = {
    "matchedUser": {
        "submitStats": {"acSubmissionNum": [
            {"difficulty": "All", "count": 695}, {"difficulty": "Easy", "count": 127},
            {"difficulty": "Medium", "count": 416}, {"difficulty": "Hard", "count": 152}]},
        "userCalendar": {"streak": 3, "totalActiveDays": 48},
    },
    "userContestRanking": {"attendedContestsCount": 27, "rating": 1904.316, "globalRanking": 7625, "topPercentage": 4.5, "badge": {"name": "Knight"}},
    "userContestRankingHistory": [
        {"attended": True, "rating": 1556.2}, {"attended": False, "rating": 1999.0},  # not attended: ignored for peak
        {"attended": True, "rating": 1950.9}, {"attended": True, "rating": 1904.3},
    ],
}


def test_leetcode_metrics_and_knight_badge_come_from_the_api():
    out = platforms.normalize_leetcode("lee", LC_DATA).normalized
    m = out["metrics"]
    assert (m["problems_solved_total"]["value"], m["problems_hard"]["value"]) == (695, 152)
    assert m["rating_current"]["value"] == 1904
    assert m["rating_peak"]["value"] == 1951  # max over attended contests only
    assert m["contests_count"]["value"] == 27 and m["streak_current"]["value"] == 3
    assert m["rating_badge"]["value"] == "Knight"  # the API's own badge name, not computed
    assert out["profile_url"] == "https://leetcode.com/u/lee/"


def test_leetcode_without_contests_marks_rating_unavailable_never_zero():
    data = {**LC_DATA, "userContestRanking": None, "userContestRankingHistory": []}
    m = platforms.normalize_leetcode("lee", data).normalized["metrics"]
    for key in ("rating_current", "rating_peak", "contests_count", "rating_badge", "global_rank"):
        assert m[key] == {"value": None, "available": False}, key
    assert m["problems_solved_total"]["value"] == 695


def test_leetcode_unknown_user_and_http_failures():
    unknown = _client(lambda r: httpx.Response(200, json={"data": {"matchedUser": None}, "errors": [{"message": "x"}]}))
    with pytest.raises(ConnectorError) as exc:
        platforms.fetch_leetcode("ghost", client=unknown)
    assert exc.value.code == "NOT_FOUND"
    with pytest.raises(ConnectorError) as exc:
        platforms.fetch_leetcode("x", client=_client(lambda r: httpx.Response(429)))
    assert exc.value.code == "RATE_LIMITED"
    with pytest.raises(ConnectorError) as exc:
        platforms.fetch_leetcode("x", client=_client(lambda r: httpx.Response(200, text="<html>")))
    assert exc.value.code == "MALFORMED_RESPONSE"


def test_leetcode_request_is_a_fixed_host_graphql_post():
    seen = {}

    def handler(req: httpx.Request) -> httpx.Response:
        seen.update(url=str(req.url), referer=req.headers.get("referer"))
        return httpx.Response(200, json={"data": LC_DATA})

    platforms.fetch_leetcode("lee215", client=_client(handler))
    assert seen["url"] == "https://leetcode.com/graphql" and "lee215" in seen["referer"]


def test_bad_usernames_never_reach_the_network():
    def boom(req):
        raise AssertionError("network used")

    for fn in (platforms.fetch_leetcode, platforms.fetch_codechef, platforms.fetch_hackerrank):
        with pytest.raises(ConnectorError) as exc:
            fn("../etc/passwd", client=_client(boom))
        assert exc.value.code == "INVALID_USERNAME"


# ---- CodeChef -----------------------------------------------------------------------------------------

CC_HTML = """<html><head><style>.rating-number .rating-tooltip { height: 16px; }</style></head><body>
<div class="rating-header text-center">
  <div class="rating-number"> 1823 </div>
  <div class="rating-star"> <span style="background-color:#D0011B">&#9733;</span><span style="background-color:#D0011B">&#9733;</span><span>&#9733;</span><span>&#9733;</span> </div>
  <small>(Highest Rating 1911)</small>
</div>
<div class="rating-ranks"><ul class="inline-list">
  <li><a href="/ratings/all"><strong> 4,512 </strong></a> Global Rank </li>
  <li><a href="/ratings/all?filterBy=Country%3DIndia"> <strong> 893 </strong> </a> Country Rank </li>
</ul></div>
<div id="rating-block-dsa-monday" style="display:none"><div class="rating-number"> NA </div></div>
<div class="contest-participated-count"><b>Contests Participated:</b> <b>41</b></div>
<h3>Total Problems Solved: 312</h3>
<script>var all_rating = [{"code":"A","rating":"1400","rank":"152","name":"A"},{"code":"B","rating":"1500","rank":"37","name":"B"},{"code":"C","rating":"1823","rank":"480","name":"C"}];</script>
</body></html>""".replace("<b>Contests Participated:</b> <b>41</b>", "Contests Participated: <b>41</b>")


def test_codechef_page_parsing():
    out = platforms.parse_codechef("chef", CC_HTML).normalized
    m = out["metrics"]
    assert m["rating_current"]["value"] == 1823  # the real rating div, not the CSS text or the 'NA' block
    assert m["rating_peak"]["value"] == 1911
    assert m["stars"]["value"] == 4  # counted from the first rating-star block
    assert m["problems_solved_total"]["value"] == 312 and m["contests_count"]["value"] == 41
    assert (m["global_rank"]["value"], m["country_rank"]["value"]) == (4512, 893)
    assert m["best_contest_rank"]["value"] == 37
    assert any("all-time-highest" in w for w in out["warnings"])  # the limitation is stated, not hidden


def test_codechef_inactive_ranks_and_unrated_user_are_unavailable():
    html = CC_HTML.replace("4,512", "Inactive").replace(" 893 ", "Inactive")
    m = platforms.parse_codechef("chef", html).normalized["metrics"]
    assert m["global_rank"]["available"] is False and m["country_rank"]["available"] is False
    unrated = '<div class="rating-number"> NA </div><h3>Total Problems Solved: 9</h3>'
    m = platforms.parse_codechef("new", unrated).normalized["metrics"]
    assert m["rating_current"]["available"] is False and m["stars"]["available"] is False
    assert m["problems_solved_total"]["value"] == 9


def test_codechef_unrecognised_layout_suggests_manual_entry():
    with pytest.raises(ConnectorError) as exc:
        platforms.parse_codechef("chef", "<html>redesigned</html>")
    assert exc.value.code == "MALFORMED_RESPONSE" and "manually" in exc.value.message


def test_codechef_redirect_away_from_users_means_not_found():
    def handler(req: httpx.Request) -> httpx.Response:
        if req.url.path.startswith("/users/"):
            return httpx.Response(302, headers={"location": "https://www.codechef.com/"})
        return httpx.Response(200, text="<html>home</html>")

    with pytest.raises(ConnectorError) as exc:
        platforms.fetch_codechef("ghost", client=_client(handler))
    assert exc.value.code == "NOT_FOUND"
    assert platforms.fetch_codechef("chef", client=_client(lambda r: httpx.Response(200, text=CC_HTML))).normalized["username"] == "chef"


# ---- HackerRank ---------------------------------------------------------------------------------------

def _hr(*badges):
    return {"status": True, "models": [{"badge_name": n, "stars": s} for n, s in badges]}


def test_hackerrank_stars_for_the_four_tracks():
    body = _hr(("Problem Solving", 5), ("Java", 3), ("C++", 4), ("Python", 2), ("SQL", 5))
    m = platforms.normalize_hackerrank("hr", body).normalized["metrics"]
    assert {k: v["value"] for k, v in m.items()} == {
        "stars_problem_solving": 5, "stars_java": 3, "stars_cpp": 4, "stars_python": 2}


def test_hackerrank_missing_track_is_unavailable_and_empty_profile_warns():
    result = platforms.normalize_hackerrank("hr", _hr(("Java", 2)))
    assert result.normalized["metrics"]["stars_python"] == {"value": None, "available": False}
    empty = platforms.normalize_hackerrank("hr", {"status": True, "models": []})
    assert all(not v["available"] for v in empty.normalized["metrics"].values()) and empty.normalized["warnings"]


def test_hackerrank_not_found_and_malformed():
    with pytest.raises(ConnectorError) as exc:
        platforms.fetch_hackerrank("ghost", client=_client(lambda r: httpx.Response(404)))
    assert exc.value.code == "NOT_FOUND"
    with pytest.raises(ConnectorError) as exc:
        platforms.fetch_hackerrank("x", client=_client(lambda r: httpx.Response(200, text="<html>")))
    assert exc.value.code == "MALFORMED_RESPONSE"


def test_unsupported_platform_has_a_stable_error():
    with pytest.raises(ConnectorError) as exc:
        platforms.fetch("GITHUB", "x")
    assert exc.value.code == "UNSUPPORTED_PLATFORM"


# ---- API ----------------------------------------------------------------------------------------------

class FakePlatforms:
    def __init__(self):
        self.error: ConnectorError | None = None
        self.calls: list[tuple[str, str]] = []

    def __call__(self, platform, username):
        self.calls.append((platform, username))
        if self.error:
            raise self.error
        if platform == "LEETCODE":
            return platforms.normalize_leetcode(username, LC_DATA)
        if platform == "CODECHEF":
            return platforms.parse_codechef(username, CC_HTML)
        return platforms.normalize_hackerrank(username, _hr(("Problem Solving", 4)))


@pytest.fixture()
def fake(app):
    f = FakePlatforms()
    app.dependency_overrides[get_platform_fetcher] = lambda: f
    app.dependency_overrides[get_cooldown] = lambda: dt.timedelta(minutes=15)
    return f


@pytest.mark.parametrize("platform,metric,value", [
    ("LEETCODE", "rating_badge", "Knight"), ("CODECHEF", "stars", 4), ("HACKERRANK", "stars_problem_solving", 4)])
def test_connect_each_platform_through_the_api(client, fake, platform, metric, value):
    r = client.http.put(f"/api/v1/coding/accounts/{platform}", json={"username": "asha"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["source_method"] == "PUBLIC_PROFILE" and body["status"] == "OK" and body["username"] == "asha"
    assert body["metrics"][metric]["value"] == value
    assert fake.calls == [(platform, "asha")]
    row = {x["platform"]: x for x in client.http.get("/api/v1/coding/dashboard").json()}[platform]
    assert row["connected"] is True


def test_connect_errors_map_to_http_and_manual_entry_still_works(client, fake):
    fake.error = ConnectorError("NOT_FOUND", "That LeetCode username was not found.")
    assert client.http.put("/api/v1/coding/accounts/LEETCODE", json={"username": "x"}).status_code == 404
    fake.error = ConnectorError("MALFORMED_RESPONSE", "CodeChef sent data we could not read. Enter your stats manually instead.")
    assert client.http.put("/api/v1/coding/accounts/CODECHEF", json={"username": "x"}).status_code == 502
    r = client.http.put("/api/v1/coding/accounts/CODECHEF/manual", json={"username": "x", "rating_current": 1500})
    assert r.status_code == 200 and r.json()["source_method"] == "MANUAL"


def test_connecting_over_a_manual_account_switches_it_to_live(client, fake):
    client.http.put("/api/v1/coding/accounts/LEETCODE/manual", json={"username": "asha", "problems_solved_total": 10})
    r = client.http.put("/api/v1/coding/accounts/LEETCODE", json={"username": "asha"})
    assert r.json()["source_method"] == "PUBLIC_PROFILE" and r.json()["metrics"]["problems_solved_total"]["value"] == 695


def test_refresh_a_live_platform_with_cooldown_and_stale_fallback(client, fake, session_factory):
    client.http.put("/api/v1/coding/accounts/LEETCODE", json={"username": "asha"})
    assert client.http.post("/api/v1/coding/accounts/LEETCODE/refresh").status_code == 429

    from app.db.models.coding import CodingPlatformAccount

    db = session_factory()
    db.query(CodingPlatformAccount).one().last_refresh_attempt_at = dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=1)
    db.commit()
    db.close()
    ok = client.http.post("/api/v1/coding/accounts/LEETCODE/refresh")
    assert ok.status_code == 200 and ok.json()["status"] == "OK" and len(fake.calls) == 2

    db = session_factory()
    db.query(CodingPlatformAccount).one().last_refresh_attempt_at = dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=1)
    db.commit()
    db.close()
    fake.error = ConnectorError("PLATFORM_UNAVAILABLE", "LeetCode is not responding.")
    stale = client.http.post("/api/v1/coding/accounts/LEETCODE/refresh").json()
    assert stale["status"] == "STALE" and stale["metrics"]["problems_solved_total"]["available"] is True
    assert any("Refresh failed" in w for w in stale["warnings"])


def test_refresh_manual_account_is_still_refused(client, fake):
    client.http.put("/api/v1/coding/accounts/HACKERRANK/manual", json={"username": "x", "stars": 3})
    assert client.http.post("/api/v1/coding/accounts/HACKERRANK/refresh").status_code == 400


def test_platform_accounts_are_private_to_their_owner(client, fake):
    client.http.put("/api/v1/coding/accounts/LEETCODE", json={"username": "asha"})
    client.as_user("user-b")
    assert client.http.get("/api/v1/coding/dashboard").json()[1]["connected"] is False
    assert client.http.post("/api/v1/coding/accounts/LEETCODE/refresh").status_code == 404


# ---- GitHub READMEs -----------------------------------------------------------------------------------

def _gh_repo(i, **kw):
    return {"id": i, "full_name": f"octo/r{i}", "html_url": f"https://github.com/octo/r{i}", "language": "Python",
            "stargazers_count": 0, "fork": False, "archived": False, "pushed_at": f"2026-10-{i + 1:02d}T10:00:00Z", **kw}


def test_fetch_attaches_capped_readmes_to_the_most_recent_repos_only():
    asked = []

    def handler(req: httpx.Request) -> httpx.Response:
        if req.url.path.endswith("/readme"):
            asked.append(req.url.path)
            assert req.headers["accept"] == "application/vnd.github.raw+json"
            return httpx.Response(200, text="# Title\n" + "x" * 9000) if "/r27/" in req.url.path else httpx.Response(404)
        if req.url.path.endswith("/repos"):
            return httpx.Response(200, json=[_gh_repo(i) for i in range(28)])
        return httpx.Response(200, json={"login": "octo", "public_repos": 28})

    result = github.fetch("octo", client=_client(handler))
    assert len(asked) == github.README_REPOS == 25
    assert "/repos/octo/r2/readme" not in asked and "/repos/octo/r27/readme" in asked  # most recently pushed first
    top = next(r for r in result.repositories if r["full_name"] == "octo/r27")
    assert top["readme"].startswith("# Title") and len(top["readme"]) == github.README_MAX_CHARS
    assert "readme" not in next(r for r in result.repositories if r["full_name"] == "octo/r26")  # 404: skipped


def test_readme_rate_limit_stops_further_requests_without_failing_the_connect():
    asked = []

    def handler(req: httpx.Request) -> httpx.Response:
        if req.url.path.endswith("/readme"):
            asked.append(1)
            return httpx.Response(403, headers={"x-ratelimit-remaining": "0"})
        if req.url.path.endswith("/repos"):
            return httpx.Response(200, json=[_gh_repo(i) for i in range(5)])
        return httpx.Response(200, json={"login": "octo", "public_repos": 5})

    result = github.fetch("octo", client=_client(handler))
    assert len(asked) == 1 and len(result.repositories) == 5


def test_readmes_are_stored_listed_as_excerpts_and_exposed_in_full_for_the_ai(client, app, session_factory):
    from app.db.models.profile import StudentProfile

    long_readme = "# Tracker\n" + "Built with React and FastAPI. " * 100

    def fetcher(username):
        result = github.normalize({"login": username, "public_repos": 2}, [_gh_repo(1), _gh_repo(2, archived=True)])
        result.repositories[0]["readme"] = long_readme
        return result

    app.dependency_overrides[get_github_fetcher] = lambda: fetcher
    client.http.put("/api/v1/coding/accounts/GITHUB", json={"username": "octo"})
    listed = {r["full_name"]: r for r in client.http.get("/api/v1/coding/repositories").json()}
    assert listed["octo/r1"]["readme_excerpt"] == long_readme[:400]
    assert listed["octo/r2"]["readme_excerpt"] is None

    db = session_factory()
    profile = db.query(StudentProfile).one()
    full = service.repo_readmes(db, profile)
    db.close()
    assert [r["full_name"] for r in full] == ["octo/r1"]  # archived project excluded
    assert full[0]["readme"] == long_readme and set(full[0]) == {"id", "full_name", "url", "language", "topics", "description", "readme"}
