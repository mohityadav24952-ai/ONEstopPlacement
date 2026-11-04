import datetime as dt

import httpx
import pytest

from app.integrations import github
from app.integrations.github import ConnectorError
from app.modules.coding.router import get_cooldown, get_github_fetcher

USER = {"login": "octo", "html_url": "https://github.com/octo", "public_repos": 2, "followers": 5}
REPOS = [
    {"id": 1, "full_name": "octo/app", "html_url": "https://github.com/octo/app",
     "description": "An app", "language": "Python", "stargazers_count": 3,
     "topics": ["fastapi"], "pushed_at": "2026-10-01T10:00:00Z", "fork": False},
    {"id": 2, "full_name": "octo/forked", "html_url": "https://github.com/octo/forked",
     "language": "Go", "stargazers_count": 100, "pushed_at": "2026-09-01T10:00:00Z", "fork": True},
]


class FakeGithub:
    def __init__(self):
        self.error: ConnectorError | None = None
        self.calls = 0

    def __call__(self, username):
        self.calls += 1
        if self.error:
            raise self.error
        return github.normalize({**USER, "login": username}, REPOS)


@pytest.fixture()
def fake(app):
    f = FakeGithub()
    app.dependency_overrides[get_github_fetcher] = lambda: f
    app.dependency_overrides[get_cooldown] = lambda: dt.timedelta(minutes=15)
    return f


# ---- normaliser -------------------------------------------------------
def test_normalize_excludes_forks_from_stars_and_marks_missing():
    result = github.normalize({"login": "octo", "public_repos": 2}, REPOS)
    m = result.normalized["metrics"]
    assert m["stars_received"]["value"] == 3  # fork's 100 stars not counted
    assert m["followers"] == {"value": None, "available": False}  # never 0
    assert result.normalized["languages"] == {"Python": 1}


def test_fetch_rejects_bad_username_without_network():
    with pytest.raises(ConnectorError) as exc:
        github.fetch("not valid!")
    assert exc.value.code == "INVALID_USERNAME"


def _client_for(handler):
    return httpx.Client(transport=httpx.MockTransport(handler))


@pytest.mark.parametrize(
    "status,headers,code",
    [
        (404, {}, "NOT_FOUND"),
        (403, {"x-ratelimit-remaining": "0"}, "RATE_LIMITED"),
        (503, {}, "PLATFORM_UNAVAILABLE"),
    ],
)
def test_fetch_failure_modes(status, headers, code):
    client = _client_for(lambda req: httpx.Response(status, headers=headers, json={}))
    with pytest.raises(ConnectorError) as exc:
        github.fetch("octo", client=client)
    assert exc.value.code == code


def test_fetch_malformed_and_timeout():
    bad = _client_for(lambda req: httpx.Response(200, text="<html>"))
    with pytest.raises(ConnectorError) as exc:
        github.fetch("octo", client=bad)
    assert exc.value.code == "MALFORMED_RESPONSE"

    def slow(req):
        raise httpx.ReadTimeout("slow")

    with pytest.raises(ConnectorError) as exc:
        github.fetch("octo", client=_client_for(slow))
    assert exc.value.code == "TIMEOUT"


# ---- API ---------------------------------------------------------------
def test_dashboard_lists_all_platforms_unconnected(client):
    rows = client.http.get("/api/v1/coding/dashboard").json()
    assert [r["platform"] for r in rows] == ["GITHUB", "LEETCODE", "CODECHEF", "HACKERRANK"]
    assert all(r["connected"] is False for r in rows)
    assert rows[1]["manual_only"] is True


def test_connect_github_and_repositories(client, fake):
    r = client.http.put("/api/v1/coding/accounts/GITHUB", json={"username": "octo"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "OK" and body["source_method"] == "OFFICIAL_API"
    assert body["fetched_at"]
    repos = client.http.get("/api/v1/coding/repositories").json()
    assert {x["full_name"] for x in repos} == {"octo/app", "octo/forked"}


def test_connect_errors_map_to_http(client, fake):
    fake.error = ConnectorError("NOT_FOUND", "That GitHub username was not found.")
    assert client.http.put("/api/v1/coding/accounts/GITHUB", json={"username": "x"}).status_code == 404
    fake.error = ConnectorError("PLATFORM_UNAVAILABLE", "GitHub is not responding.")
    r = client.http.put("/api/v1/coding/accounts/GITHUB", json={"username": "x"})
    assert r.status_code == 502 and "manually" in r.json()["error"]["message"]


def test_unofficial_platform_is_manual_only(client):
    r = client.http.put("/api/v1/coding/accounts/LEETCODE", json={"username": "x"})
    assert r.status_code == 400 and r.json()["error"]["code"] == "MANUAL_ONLY"


def test_refresh_cooldown_and_stale_fallback(client, fake, session_factory):
    client.http.put("/api/v1/coding/accounts/GITHUB", json={"username": "octo"})
    cooled = client.http.post("/api/v1/coding/accounts/GITHUB/refresh")
    assert cooled.status_code == 429  # within 15 min of connect

    from app.db.models.coding import CodingPlatformAccount

    db = session_factory()
    acct = db.query(CodingPlatformAccount).one()
    acct.last_refresh_attempt_at = dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=1)
    db.commit()
    db.close()

    fake.error = ConnectorError("RATE_LIMITED", "GitHub rate limit reached. Try again later.")
    r = client.http.post("/api/v1/coding/accounts/GITHUB/refresh")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "STALE"  # last snapshot kept, flagged
    assert body["metrics"]["public_repos"]["available"] is True
    assert any("Refresh failed" in w for w in body["warnings"])


def test_old_api_snapshot_reported_stale(client, fake, session_factory):
    client.http.put("/api/v1/coding/accounts/GITHUB", json={"username": "octo"})
    from app.db.models.coding import CodingPlatformSnapshot

    db = session_factory()
    snap = db.query(CodingPlatformSnapshot).one()
    snap.fetched_at = dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=30)
    db.commit()
    db.close()
    row = client.http.get("/api/v1/coding/dashboard").json()[0]
    assert row["status"] == "STALE"


def test_manual_entry_validation_and_labelling(client):
    base = "/api/v1/coding/accounts/LEETCODE/manual"
    assert client.http.put(base, json={"username": "asha"}).status_code == 422  # no stats
    assert client.http.put(base, json={"username": "asha", "problems_solved_total": -1}).status_code == 422
    assert client.http.put(
        base, json={"username": "asha", "rating_current": 1800, "rating_max": 1500}
    ).status_code == 422
    r = client.http.put(base, json={"username": "asha", "problems_solved_total": 250})
    assert r.status_code == 200
    body = r.json()
    assert body["source_method"] == "MANUAL"
    assert body["metrics"]["problems_solved_total"]["value"] == 250
    assert "rating_current" not in body["metrics"]  # not entered -> absent, not 0


def test_snapshots_pruned_to_five(client, session_factory):
    base = "/api/v1/coding/accounts/CODECHEF/manual"
    for n in range(7):
        client.http.put(base, json={"username": "asha", "problems_solved_total": n})
    from app.db.models.coding import CodingPlatformSnapshot

    db = session_factory()
    assert db.query(CodingPlatformSnapshot).count() == 5
    db.close()


def test_isolation_between_users(client, fake):
    client.http.put("/api/v1/coding/accounts/GITHUB", json={"username": "octo"})
    repo_id = client.http.get("/api/v1/coding/repositories").json()[0]["id"]
    client.as_user("user-b")
    assert client.http.get("/api/v1/coding/repositories").json() == []
    assert client.http.get("/api/v1/coding/dashboard").json()[0]["connected"] is False
    assert client.http.post(f"/api/v1/coding/repositories/{repo_id}/propose-project").status_code == 404
    assert client.http.post("/api/v1/coding/accounts/GITHUB/refresh").status_code == 404
    assert client.http.delete("/api/v1/coding/accounts/GITHUB").status_code == 404


def test_one_failing_connector_does_not_affect_others(client, fake):
    client.http.put("/api/v1/coding/accounts/LEETCODE/manual", json={"username": "a", "stars": 3})
    fake.error = ConnectorError("PLATFORM_UNAVAILABLE", "down")
    client.http.put("/api/v1/coding/accounts/GITHUB", json={"username": "octo"})
    rows = {r["platform"]: r for r in client.http.get("/api/v1/coding/dashboard").json()}
    assert rows["LEETCODE"]["connected"] is True and rows["LEETCODE"]["status"] == "OK"


def test_propose_project_creates_proposal_only(client, fake):
    client.http.put("/api/v1/coding/accounts/GITHUB", json={"username": "octo"})
    repo = next(
        r for r in client.http.get("/api/v1/coding/repositories").json() if r["full_name"] == "octo/app"
    )
    r = client.http.post(f"/api/v1/coding/repositories/{repo['id']}/propose-project")
    assert r.status_code == 201
    payload = r.json()["payload"]
    assert payload["links"] == ["https://github.com/octo/app"]
    assert "outcomes" not in payload and "contribution" not in payload  # nothing invented
    assert client.http.get("/api/v1/profile/projects").json() == []  # not applied
    again = client.http.post(f"/api/v1/coding/repositories/{repo['id']}/propose-project")
    assert again.json()["id"] == r.json()["id"]  # no duplicate proposals


def test_disconnect_removes_account_and_optionally_repos(client, fake):
    client.http.put("/api/v1/coding/accounts/GITHUB", json={"username": "octo"})
    assert client.http.delete("/api/v1/coding/accounts/GITHUB").status_code == 204
    assert client.http.get("/api/v1/coding/dashboard").json()[0]["connected"] is False
    assert len(client.http.get("/api/v1/coding/repositories").json()) == 2
    client.http.put("/api/v1/coding/accounts/GITHUB", json={"username": "octo"})
    client.http.delete("/api/v1/coding/accounts/GITHUB?delete_data=true")
    assert client.http.get("/api/v1/coding/repositories").json() == []
