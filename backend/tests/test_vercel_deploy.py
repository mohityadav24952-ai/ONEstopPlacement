"""1-click Vercel deploy: the API client (against a fake Vercel) and the portfolio-site endpoints.

No test reaches the real Vercel API or the real frontend: both are replaced by in-process fakes.
"""
import hashlib
import io
import json
import zipfile

import httpx
import pytest

from app.integrations import vercel
from app.modules.site_builder.router import get_snapshot_fetcher, get_vercel_client

BASE = "/api/v1/portfolio-site"
TOKEN = "test-token-never-shown"


def make_zip(files: dict[str, bytes]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        for name, data in files.items():
            z.writestr(name, data)
    return buf.getvalue()


SITE = {"index.html": b"<html>hi</html>", "assets/style-1.css": b"body{}", "README.txt": b"how to deploy"}


class FakeVercel:
    """Records every request and answers like the Vercel REST API."""

    def __init__(self, status_body: dict | None = None, fail: dict[str, int] | None = None):
        self.requests: list[httpx.Request] = []
        self.uploaded: dict[str, bytes] = {}
        self.status_body = status_body
        self.fail = fail or {}

    def __call__(self, req: httpx.Request) -> httpx.Response:
        self.requests.append(req)
        for prefix, code in self.fail.items():
            if req.url.path.startswith(prefix):
                return httpx.Response(code, json={"error": {"code": "x", "message": "nope"}})
        if req.method == "POST" and req.url.path == "/v2/files":
            self.uploaded[req.headers["x-vercel-digest"]] = req.content
            return httpx.Response(200, json={})
        if req.method == "POST" and req.url.path == "/v13/deployments":
            body = json.loads(req.content)
            return httpx.Response(200, json={"id": "dpl_abc123XYZ", "name": body["name"], "readyState": "QUEUED",
                                             "url": f"{body['name']}-h4sh.vercel.app", "alias": []})
        if req.method == "GET" and req.url.path.startswith("/v13/deployments/"):
            return httpx.Response(200, json=self.status_body)
        return httpx.Response(404)

    def client(self, team_id: str = "") -> vercel.VercelClient:
        return vercel.VercelClient(TOKEN, team_id, 5, transport=httpx.MockTransport(self))


# ---- pure helpers -------------------------------------------------------------------------------------

def test_project_name_is_prefixed_and_vercel_safe():
    assert vercel.project_name("osp-", "asha-dev") == "osp-asha-dev"
    assert vercel.project_name("OSP_", "Asha") == "osp_asha"


def test_files_from_zip_keeps_the_site_and_drops_the_readme():
    files = vercel.files_from_zip(make_zip(SITE))
    assert files == {"index.html": b"<html>hi</html>", "assets/style-1.css": b"body{}"}


@pytest.mark.parametrize("bad", ["../evil.html", "/etc/passwd", "C:/x.html"])
def test_files_from_zip_rejects_unsafe_paths(bad):
    with pytest.raises(vercel.VercelError) as err:
        vercel.files_from_zip(make_zip({"index.html": b"x", bad: b"x"}))
    assert err.value.code == "EXPORT_FAILED"


def test_files_from_zip_needs_an_index_and_enforces_limits(monkeypatch):
    with pytest.raises(vercel.VercelError):
        vercel.files_from_zip(make_zip({"a.css": b"x"}))
    with pytest.raises(vercel.VercelError):
        vercel.files_from_zip(b"not a zip")
    monkeypatch.setattr(vercel, "MAX_FILES", 1)
    with pytest.raises(vercel.VercelError) as err:
        vercel.files_from_zip(make_zip({"index.html": b"x", "b.css": b"y"}))
    assert err.value.code == "EXPORT_TOO_LARGE"


# ---- the API client -----------------------------------------------------------------------------------

def test_deploy_uploads_each_file_by_sha1_then_creates_a_production_deployment():
    fake = FakeVercel()
    d = fake.client(team_id="team_123").deploy("osp-asha-dev", {"index.html": b"<html/>", "a.css": b"b{}"})

    assert d.id == "dpl_abc123XYZ" and d.state == "queued" and not d.done and d.url is None
    uploads, create = fake.requests[:-1], fake.requests[-1]
    assert len(uploads) == 2
    for req in fake.requests:
        assert req.headers["authorization"] == f"Bearer {TOKEN}"
        assert req.url.params["teamId"] == "team_123"
    for digest, content in fake.uploaded.items():
        assert hashlib.sha1(content).hexdigest() == digest
    body = json.loads(create.content)
    assert body["name"] == "osp-asha-dev" and body["target"] == "production"
    assert body["projectSettings"] == {"framework": None}
    assert {f["file"] for f in body["files"]} == {"index.html", "a.css"}
    assert all(set(f) == {"file", "sha", "size"} for f in body["files"])  # by reference, never inlined


def test_no_team_id_means_no_team_param():
    fake = FakeVercel()
    fake.client().deploy("osp-x", {"index.html": b"x"})
    assert all("teamId" not in r.url.params for r in fake.requests)


def test_ready_deployment_reports_the_production_alias_not_the_protected_deployment_url():
    fake = FakeVercel({"id": "dpl_abc123XYZ", "name": "osp-asha-dev", "readyState": "READY",
                       "url": "osp-asha-dev-h4sh-team.vercel.app",
                       "alias": ["osp-asha-dev-team.vercel.app", "osp-asha-dev.vercel.app"]})
    d = fake.client().get("dpl_abc123XYZ", "osp-asha-dev")
    assert d.state == "ready" and d.done and d.url == "https://osp-asha-dev.vercel.app"


def test_built_but_alias_not_assigned_yet_keeps_polling():
    fake = FakeVercel({"id": "dpl_abc123XYZ", "name": "osp-a", "readyState": "READY", "alias": []})
    d = fake.client().get("dpl_abc123XYZ", "osp-a")
    assert d.state == "finalizing" and not d.done


@pytest.mark.parametrize("ready_state, expected", [("ERROR", "error"), ("CANCELED", "canceled"), ("BLOCKED", "error")])
def test_failed_deployments_carry_a_message(ready_state, expected):
    fake = FakeVercel({"id": "dpl_abc123XYZ", "name": "osp-a", "readyState": ready_state, "errorMessage": "Build failed"})
    d = fake.client().get("dpl_abc123XYZ", "osp-a")
    assert d.state == expected and d.done and d.error


def test_status_of_someone_elses_deployment_is_not_found():
    fake = FakeVercel({"id": "dpl_abc123XYZ", "name": "osp-other", "readyState": "READY", "alias": ["osp-other.vercel.app"]})
    with pytest.raises(vercel.VercelError) as err:
        fake.client().get("dpl_abc123XYZ", "osp-mine")
    assert err.value.code == "NOT_FOUND"


def test_malformed_deployment_id_never_reaches_vercel():
    fake = FakeVercel()
    with pytest.raises(vercel.VercelError):
        fake.client().get("../v2/user", "osp-a")
    assert fake.requests == []


@pytest.mark.parametrize("status, code", [(401, "VERCEL_AUTH"), (403, "VERCEL_AUTH"), (402, "VERCEL_PAYMENT"),
                                          (429, "RATE_LIMITED"), (400, "VERCEL_REJECTED"), (503, "VERCEL_UNAVAILABLE")])
def test_vercel_errors_map_to_stable_codes_without_leaking_the_token(status, code):
    fake = FakeVercel(fail={"/v2/files": status})
    with pytest.raises(vercel.VercelError) as err:
        fake.client().deploy("osp-a", {"index.html": b"x"})
    assert err.value.code == code and TOKEN not in err.value.message


def test_network_failure_is_a_clean_error():
    def boom(req):
        raise httpx.ConnectError("down", request=req)

    client = vercel.VercelClient(TOKEN, "", 5, transport=httpx.MockTransport(boom))
    with pytest.raises(vercel.VercelError) as err:
        client.deploy("osp-a", {"index.html": b"x"})
    assert err.value.code == "VERCEL_UNAVAILABLE"


# ---- endpoints ----------------------------------------------------------------------------------------

def claim_and_publish(client, handle="asha-dev", publish=True):
    r = client.http.post(f"{BASE}/claim-handle", json={"handle": handle, "acceptedTerms": True})
    assert r.status_code == 200, r.text
    data = r.json()
    data["config"]["isPublished"] = publish
    assert client.http.put(f"{BASE}/me", json=data).status_code == 200


@pytest.fixture()
def fake_vercel(app):
    fake = FakeVercel()
    fetched: list[str] = []

    def fetch(handle: str) -> bytes:
        fetched.append(handle)
        return make_zip(SITE)

    app.dependency_overrides[get_vercel_client] = lambda: fake.client()
    app.dependency_overrides[get_snapshot_fetcher] = lambda: fetch
    fake.fetched = fetched
    return fake


def test_deploy_is_unavailable_until_the_server_has_a_token(client):
    claim_and_publish(client)
    r = client.http.post(f"{BASE}/deploy/vercel")
    assert r.status_code == 503 and r.json()["error"]["code"] == "VERCEL_NOT_CONFIGURED"


def test_deploy_requires_a_published_portfolio(client, fake_vercel):
    claim_and_publish(client, publish=False)
    r = client.http.post(f"{BASE}/deploy/vercel")
    assert r.status_code == 409 and r.json()["error"]["code"] == "NOT_PUBLISHED"
    assert fake_vercel.requests == [] and fake_vercel.fetched == []


def test_deploy_ships_the_export_snapshot_and_status_reports_live(client, fake_vercel):
    claim_and_publish(client)
    r = client.http.post(f"{BASE}/deploy/vercel")
    assert r.status_code == 200, r.text
    assert r.json() == {"id": "dpl_abc123XYZ", "project": "osp-asha-dev", "state": "queued", "done": False}
    assert fake_vercel.fetched == ["asha-dev"]
    assert set(fake_vercel.uploaded.values()) == {SITE["index.html"], SITE["assets/style-1.css"]}  # no README

    fake_vercel.status_body = {"id": "dpl_abc123XYZ", "name": "osp-asha-dev", "readyState": "READY",
                               "alias": ["osp-asha-dev.vercel.app"]}
    s = client.http.get(f"{BASE}/deploy/vercel/dpl_abc123XYZ").json()
    assert s["state"] == "ready" and s["done"] is True and s["url"] == "https://osp-asha-dev.vercel.app"


def test_another_user_cannot_poll_my_deployment(client, fake_vercel):
    claim_and_publish(client)
    client.http.post(f"{BASE}/deploy/vercel")
    fake_vercel.status_body = {"id": "dpl_abc123XYZ", "name": "osp-asha-dev", "readyState": "READY",
                               "alias": ["osp-asha-dev.vercel.app"]}
    client.as_user("user-b")
    claim_and_publish(client, "bob-dev")
    r = client.http.get(f"{BASE}/deploy/vercel/dpl_abc123XYZ")
    assert r.status_code == 404


def test_vercel_auth_failure_reaches_the_user_as_a_clear_error(client, fake_vercel):
    claim_and_publish(client)
    fake_vercel.fail = {"/v2/files": 401}
    r = client.http.post(f"{BASE}/deploy/vercel")
    assert r.status_code == 502 and r.json()["error"]["code"] == "VERCEL_AUTH"
    assert TOKEN not in r.text


def test_deploys_are_rate_limited_per_user(client, fake_vercel):
    claim_and_publish(client)
    codes = [client.http.post(f"{BASE}/deploy/vercel").status_code for _ in range(6)]
    assert codes == [200] * 5 + [429]
