import httpx
import pytest

from app.core.errors import AppError
from app.shared.storage import SupabaseStorage

BASE = "https://proj.supabase.co"


def make(handler, key="sb_secret_abc"):
    return SupabaseStorage(BASE, key, "resumes", client=httpx.Client(transport=httpx.MockTransport(handler)))


def test_put_posts_bytes_to_the_private_bucket():
    seen = {}

    def handler(req: httpx.Request) -> httpx.Response:
        seen.update(method=req.method, url=str(req.url), body=req.content, headers=req.headers)
        return httpx.Response(200, json={"Key": "ok"})

    key = make(handler).put("profile-1", b"%PDF-data", ".pdf")
    assert key.startswith("profile-1/") and key.endswith(".pdf")
    assert seen["method"] == "POST"
    assert seen["url"] == f"{BASE}/storage/v1/object/resumes/{key}"
    assert seen["body"] == b"%PDF-data"
    assert seen["headers"]["content-type"] == "application/pdf"
    assert seen["headers"]["apikey"] == "sb_secret_abc"
    assert "authorization" not in seen["headers"]  # new-style secret keys are not JWTs


def test_legacy_jwt_key_is_also_sent_as_bearer():
    seen = {}

    def handler(req):
        seen["auth"] = req.headers.get("authorization")
        return httpx.Response(200, content=b"x")

    make(handler, key="aaa.bbb.ccc").get("p/a.pdf")
    assert seen["auth"] == "Bearer aaa.bbb.ccc"


def test_get_returns_bytes_and_missing_raises():
    store = make(lambda req: httpx.Response(200, content=b"hello") if req.url.path.endswith("ok.txt") else httpx.Response(404, json={}))
    assert store.get("p/ok.txt") == b"hello"
    with pytest.raises(FileNotFoundError):
        store.get("p/missing.txt")


def test_delete_ignores_missing_and_reports_failures():
    assert make(lambda req: httpx.Response(404, json={})).delete("p/gone.pdf") is None
    with pytest.raises(AppError) as err:
        make(lambda req: httpx.Response(500, json={})).delete("p/x.pdf")
    assert err.value.code == "STORAGE_ERROR"


def test_network_failure_is_a_503_not_a_crash():
    def boom(req):
        raise httpx.ConnectError("down")

    with pytest.raises(AppError) as err:
        make(boom).get("p/a.pdf")
    assert err.value.status_code == 503


@pytest.mark.parametrize("bad", ["../x", "a/../../b", "/abs", ""])
def test_keys_cannot_traverse(bad):
    with pytest.raises(ValueError):
        make(lambda req: httpx.Response(200)).get(bad)
