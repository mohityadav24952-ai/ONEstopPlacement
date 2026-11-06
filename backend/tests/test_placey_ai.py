"""Ask Placey: web search + Gemini, only on a click, with a shared cache. No test here touches a real API."""
import json

import httpx
import pytest
from sqlalchemy import func, select

from app.ai import search as search_mod
from app.ai.llm import LLMResponse, get_placey_llm
from app.ai.mock import MockLLM
from app.ai.search import NoSearch, SearchError, TavilySearch, get_search_client
from app.core.config import Settings
from app.db.models.placey import PlaceyCache
from app.modules.interview import placey_ai

CORE = {"OS", "DBMS", "CN", "OOP"}
BODY = {"company": "Amazon", "role": "SDE Intern", "duration_days": 14}

ANSWER = {"lines": ["A deadlock is when processes wait on each other forever.", "It needs four conditions together.", "Break any one to prevent it."]}
GUIDE = {
    "hints": ["Pick one real example.", "Say what you did."],
    "values": ["Customer obsession", "Ownership", "Bias for action"],
    "framing_tips": ["Lead with the result.", "Be specific."],
    "star": {"situation": "Where were you?", "task": "What was your goal?", "action": "What did you do?", "result": "What changed?"},
}


class FakeLLM:
    provider, model = "gemini", "gemini-test"

    def __init__(self):
        self.calls, self.payloads, self.reply = 0, [], ANSWER

    def generate_json(self, req):
        self.calls += 1
        self.payloads.append(req.payload)
        return LLMResponse(text=json.dumps(self.reply), model=self.model)


class FakeSearch:
    configured = True

    def __init__(self, results=None, fail=False):
        self.calls, self.queries, self.fail = 0, [], fail
        self.results = results if results is not None else [{"title": "Deadlock - TutorialsPoint", "url": "https://example.com/deadlock", "snippet": "A deadlock is..."}]

    def search(self, query, max_results=5):
        self.calls += 1
        self.queries.append(query)
        if self.fail:
            raise SearchError("HTTP_500")
        return self.results


@pytest.fixture()
def rig(app, client):
    llm, search = FakeLLM(), FakeSearch()
    app.dependency_overrides[get_placey_llm] = lambda: llm
    app.dependency_overrides[get_search_client] = lambda: search
    return llm, search, client


def _session(client, **over):
    r = client.http.post("/api/v1/interview/sessions", json={**BODY, **over})
    assert r.status_code == 201, r.text
    return r.json()


def _qs(s, pred):
    return [q for d in s["days"] for q in d["questions"] if pred(d["topic"])]


def _ask(client, s, q):
    return client.http.post(f"/api/v1/interview/sessions/{s['id']}/questions/{q['id']}/ask-placey")


def _rows(session_factory):
    with session_factory() as db:
        return db.scalar(select(func.count()).select_from(PlaceyCache))


# ---------------- API calls happen ONLY on a click ----------------
def test_nothing_external_runs_on_page_loads(rig):
    llm, search, client = rig
    s = _session(client)
    client.http.get(f"/api/v1/interview/sessions/{s['id']}")
    client.http.get("/api/v1/interview/sessions")
    client.http.get("/api/v1/interview/resources", params={"company": "Amazon", "topic": "OS"})
    client.http.get("/api/v1/interview/questions?topic=OS")
    client.http.get("/api/v1/home")
    assert llm.calls == 0 and search.calls == 0


def test_a_click_runs_one_search_and_one_model_call(rig, session_factory):
    llm, search, client = rig
    s = _session(client)
    q = _qs(s, lambda t: t in CORE)[0]
    r = _ask(client, s, q)
    assert r.status_code == 200, r.text
    body = r.json()
    assert (llm.calls, search.calls) == (1, 1)
    assert body["kind"] == "answer" and body["lines"] == ANSWER["lines"]
    assert body["cached"] is False and body["grounded"] is True and body["model"] == "gemini-test"
    assert body["sources"] == [{"title": "Deadlock - TutorialsPoint", "url": "https://example.com/deadlock"}]
    assert _rows(session_factory) == 1


def test_search_results_reach_the_model_only_as_untrusted_data(rig):
    llm, search, client = rig
    s = _session(client)
    _ask(client, s, _qs(s, lambda t: t in CORE)[0])
    assert llm.payloads[0]["sources"][0]["url"] == "https://example.com/deadlock"
    assert "explained interview answer" in search.queries[0]


# ---------------- the cache ----------------
def test_second_ask_is_served_from_cache_with_no_api_calls(rig, session_factory):
    llm, search, client = rig
    s = _session(client)
    q = _qs(s, lambda t: t in CORE)[0]
    first = _ask(client, s, q).json()
    second = _ask(client, s, q).json()
    assert (llm.calls, search.calls) == (1, 1)  # nothing new on the second click
    assert second["cached"] is True and second["lines"] == first["lines"] and second["sources"] == first["sources"]
    assert _rows(session_factory) == 1
    with session_factory() as db:
        assert db.scalar(select(PlaceyCache.hits)) == 1


def test_cache_is_shared_across_plans_and_users_and_ignores_paraphrasing(rig):
    llm, search, client = rig
    s1 = _session(client)
    # the same original question can be worded differently in a different plan; ask the first one
    q1 = _qs(s1, lambda t: t in CORE)[0]
    _ask(client, s1, q1)
    original = q1["original_text"]
    client.as_user("user-b")
    for _ in range(6):  # new plans for another user shuffle and re-word the questions
        s2 = _session(client, company="Microsoft")
        match = next((q for q in _qs(s2, lambda t: t in CORE) if q["original_text"] == original), None)
        if match:
            body = _ask(client, s2, match).json()
            assert body["cached"] is True and llm.calls == 1 and search.calls == 1
            return
    pytest.skip("the shuffle did not surface the same question in 6 plans")


def test_cache_key_ignores_case_spacing_and_punctuation():
    k = placey_ai.cache_key
    assert k("answer", "What is a Deadlock?", None) == k("answer", "  what is a   deadlock ", None)
    assert k("answer", "What is a deadlock?", None) != k("answer", "What is paging?", None)
    # answers do not depend on the company; guidance does
    assert k("answer", "x y", "Amazon") == k("answer", "x y", "Google")
    assert k("guidance", "x y", "Amazon") != k("guidance", "x y", "Google")
    assert k("guidance", "x y", "Amazon") == k("guidance", "x y", " amazon ")
    assert k("answer", "x y", None) != k("guidance", "x y", None)


def test_guidance_is_cached_per_company(rig, session_factory):
    llm, search, client = rig
    llm.reply = GUIDE
    a = _session(client, company="Amazon")
    hr = _qs(a, lambda t: t == "HR")[0]
    first = _ask(client, a, hr).json()
    assert first["kind"] == "guidance" and first["values"] == GUIDE["values"] and first["framing_tips"] == GUIDE["framing_tips"]
    assert "Amazon core values" in search.queries[0] and first["grounded"] is True
    assert "Drawn from web search results" in first["values_note"]
    assert _ask(client, a, hr).json()["cached"] is True and llm.calls == 1
    # the same HR question for another company is a different cache entry
    g = _session(client, company="Google")
    same = next(q for q in _qs(g, lambda t: t == "HR") if q["text"] == hr["text"])
    assert _ask(client, g, same).json()["cached"] is False and llm.calls == 2
    assert _rows(session_factory) == 2


# ---------------- what is NOT cached ----------------
def test_demo_mode_placeholder_is_never_cached(app, client, session_factory):
    app.dependency_overrides[get_placey_llm] = lambda: MockLLM()
    s = _session(client)
    q = _qs(s, lambda t: t in CORE)[0]
    a, b = _ask(client, s, q).json(), _ask(client, s, q).json()
    assert a["mock"] is True and a["cached"] is False and b["cached"] is False
    assert _rows(session_factory) == 0


def test_failed_web_search_still_answers_but_is_not_cached_so_it_is_retried(rig, session_factory):
    llm, _, client = rig
    failing = FakeSearch(fail=True)
    client.app.dependency_overrides[get_search_client] = lambda: failing
    s = _session(client)
    q = _qs(s, lambda t: t in CORE)[0]
    body = _ask(client, s, q).json()
    assert body["grounded"] is False and body["sources"] == [] and "without web results" in body["disclaimer"]
    assert _rows(session_factory) == 0
    # next click, search is back: it goes out again and this time it is cached
    client.app.dependency_overrides[get_search_client] = lambda: FakeSearch()
    again = _ask(client, s, q).json()
    assert again["cached"] is False and again["grounded"] is True and _rows(session_factory) == 1


def test_without_a_search_key_answers_are_ungrounded_but_cached(app, client, session_factory):
    llm = FakeLLM()
    app.dependency_overrides[get_placey_llm] = lambda: llm
    app.dependency_overrides[get_search_client] = lambda: NoSearch()
    s = _session(client)
    q = _qs(s, lambda t: t in CORE)[0]
    assert _ask(client, s, q).json()["grounded"] is False
    assert _ask(client, s, q).json()["cached"] is True and llm.calls == 1


def test_invalid_model_output_is_neither_shown_nor_cached(rig, session_factory):
    llm, _, client = rig
    llm.reply = {"lines": ["too few"]}
    s = _session(client)
    r = _ask(client, s, _qs(s, lambda t: t in CORE)[0])
    assert r.status_code == 502 and r.json()["error"]["code"] == "AI_OUTPUT_INVALID"
    assert _rows(session_factory) == 0


# ---------------- who may click ----------------
def test_clicks_are_rate_limited_and_owner_checked(rig):
    llm, _, client = rig
    s = _session(client)
    q = _qs(s, lambda t: t in CORE)[0]
    client.as_user("user-b")
    assert _ask(client, s, q).status_code == 404 and llm.calls == 0  # someone else's plan: no call at all
    client.as_user("user-a")
    codes = [_ask(client, s, q).status_code for _ in range(23)]
    assert codes[0] == 200 and 429 in codes  # a runaway loop is stopped even though answers are cached


def test_dsa_cards_never_reach_the_model(rig):
    llm, search, client = rig
    s = _session(client)
    card = _qs(s, lambda t: t == "DSA")[0]
    assert _ask(client, s, card).status_code == 422 and (llm.calls, search.calls) == (0, 0)


# ---------------- the Tavily and Gemini adapters ----------------
def _tavily(handler):
    return TavilySearch("tvly-test", transport=httpx.MockTransport(handler))


def test_tavily_sends_bearer_key_and_parses_and_filters_results():
    seen = {}

    def handler(req):
        seen["auth"], seen["body"] = req.headers["authorization"], json.loads(req.content)
        return httpx.Response(200, json={"results": [
            {"title": "Good", "url": "https://a.example/x", "content": "c" * 2000},
            {"title": "Script", "url": "javascript:alert(1)", "content": "bad"},
            {"title": "", "url": "http://b.example/y", "content": "ok"},
        ]})

    out = _tavily(handler).search("what is a deadlock", 5)
    assert seen["auth"] == "Bearer tvly-test" and seen["body"]["query"] == "what is a deadlock" and seen["body"]["include_answer"] is False
    assert [r["url"] for r in out] == ["https://a.example/x", "http://b.example/y"]  # the javascript: link is dropped
    assert len(out[0]["snippet"]) == search_mod.MAX_SNIPPET and out[1]["title"] == "http://b.example/y"


@pytest.mark.parametrize("status", [401, 429, 500])
def test_tavily_errors_become_search_error(status):
    with pytest.raises(SearchError):
        _tavily(lambda req: httpx.Response(status, json={})).search("x")


def test_tavily_network_failure_becomes_search_error():
    def boom(req):
        raise httpx.ConnectTimeout("slow")

    with pytest.raises(SearchError):
        _tavily(boom).search("x")


def test_placey_uses_gemini_pro_first_when_a_key_is_set_and_the_mock_otherwise(monkeypatch):
    from app.ai import llm as llm_mod

    monkeypatch.setattr(llm_mod, "get_settings", lambda: Settings(gemini_api_key="k", llm_provider="mock", _env_file=None))
    c = llm_mod.get_placey_llm()
    assert isinstance(c, llm_mod.GeminiChain) and c.provider == "gemini"  # even though LLM_PROVIDER is mock
    assert c.models[0] == "gemini-3.1-pro-preview" and len(c.models) > 1
    monkeypatch.setattr(llm_mod, "get_settings", lambda: Settings(gemini_api_key="", llm_provider="mock", _env_file=None))
    assert llm_mod.get_placey_llm().provider == "mock"
    monkeypatch.setattr(llm_mod, "get_settings", lambda: Settings(gemini_api_key="k", placey_model="gemini-x", placey_fallback_models="a, b ,gemini-x", _env_file=None))
    assert llm_mod.get_placey_llm().models == ["gemini-x", "a", "b"]  # trimmed, de-duplicated, Pro first


def test_chain_falls_back_when_pro_has_no_quota_and_reports_the_model_that_answered(monkeypatch):
    from app.ai import llm as llm_mod
    from app.ai.llm import LLMError, LLMRequest

    tried = []

    class Stub:
        def __init__(self, key, model, timeout):
            self.model = model

        def generate_json(self, req):
            tried.append(self.model)
            if self.model == "pro":
                raise LLMError("RATE_LIMIT")
            if self.model == "flash-a":
                raise LLMError("PROVIDER_ERROR", "status 503")
            return LLMResponse(text='{"ok":true}', model=self.model)

    monkeypatch.setattr(llm_mod, "GeminiClient", Stub)
    chain = llm_mod.GeminiChain("k", ["pro", "flash-a", "flash-b", "flash-c"], 5)
    out = chain.generate_json(LLMRequest(workflow="w", system="s", user="u", payload={}))
    assert out.model == "flash-b" and chain.model == "flash-b" and tried == ["pro", "flash-a", "flash-b"]  # stops at the first that works


def test_chain_does_not_hide_a_bad_reply_and_gives_up_cleanly(monkeypatch):
    from app.ai import llm as llm_mod
    from app.ai.llm import LLMError, LLMRequest

    class Bad:
        def __init__(self, key, model, timeout):
            self.model = model

        def generate_json(self, req):
            raise LLMError("INVALID_JSON", "shape") if self.model == "a" else LLMError("RATE_LIMIT")

    monkeypatch.setattr(llm_mod, "GeminiClient", Bad)
    with pytest.raises(LLMError) as e:
        llm_mod.GeminiChain("k", ["a", "b"], 5).generate_json(LLMRequest(workflow="w", system="s", user="u", payload={}))
    assert e.value.category == "INVALID_JSON"  # a malformed reply is not retried on another model
    with pytest.raises(LLMError) as e:
        llm_mod.GeminiChain("k", ["x", "y"], 5).generate_json(LLMRequest(workflow="w", system="s", user="u", payload={}))
    assert e.value.category == "RATE_LIMIT"  # every model out of quota -> the last error surfaces


def test_search_is_off_without_a_key():
    assert isinstance(search_mod.build_search(Settings(tavily_api_key="", _env_file=None)), NoSearch)
    assert isinstance(search_mod.build_search(Settings(tavily_api_key="tvly-x", _env_file=None)), TavilySearch)


def test_the_real_get_placey_llm_dependency_is_overridden_in_tests(app):
    assert get_placey_llm in app.dependency_overrides  # no test can reach a real API by accident


def test_duplicate_search_results_are_listed_once(rig):
    llm, search, client = rig
    page = {"title": "Same page", "url": "https://example.com/a", "snippet": "x"}
    search.results = [page, dict(page), {"title": "Other", "url": "https://example.com/b", "snippet": "y"}]
    s = _session(client)
    body = _ask(client, s, _qs(s, lambda t: t in CORE)[0]).json()
    assert [x["url"] for x in body["sources"]] == ["https://example.com/a", "https://example.com/b"]
    assert len(llm.payloads[0]["sources"]) == 2


# ---------------- quota protection: per-IP daily cap, similar-question cache, graceful 429 ----------------
def _cap(monkeypatch, n):
    from types import SimpleNamespace
    monkeypatch.setattr(placey_ai, "get_settings", lambda: SimpleNamespace(placey_ip_daily_limit=n))


def test_each_ip_gets_a_daily_quota_of_model_calls_and_saved_answers_stay_free(rig, monkeypatch):
    llm, _, client = rig
    _cap(monkeypatch, 2)
    s = _session(client)
    q1, q2, q3 = _qs(s, lambda t: t in CORE)[:3]
    assert _ask(client, s, q1).status_code == 200 and _ask(client, s, q2).status_code == 200
    blocked = _ask(client, s, q3)
    assert blocked.status_code == 429 and blocked.json()["error"]["code"] == "PLACEY_DAILY_LIMIT"
    assert llm.calls == 2  # the blocked click never reached Gemini
    again = _ask(client, s, q1)
    assert again.status_code == 200 and again.json()["cached"] is True  # a saved answer is still served


def test_gemini_quota_error_becomes_a_friendly_message_and_is_not_charged(rig, monkeypatch, session_factory):
    from app.ai.llm import LLMError
    from app.core import ratelimit

    llm, _, client = rig

    def out_of_quota(req):
        llm.calls += 1
        raise LLMError("RATE_LIMIT")

    llm.generate_json = out_of_quota
    s = _session(client)
    r = _ask(client, s, _qs(s, lambda t: t in CORE)[0])
    assert r.status_code == 503 and r.json()["error"]["code"] == "PLACEY_RESTING"
    assert "resting right now to avoid spam" in r.json()["error"]["message"]
    assert ratelimit.daily_used("placey", "testclient") == 0 and _rows(session_factory) == 0


def test_reworded_questions_share_a_cache_entry_but_different_ones_do_not():
    t = placey_ai._content_tokens
    assert t("Explain process vs thread") == t("What is the difference between a thread and a process?")
    assert t("Explain deadlock prevention") != t("Explain deadlock avoidance")
    a, b = t("What are the ACID properties of transactions?"), t("Explain ACID property in a transaction")
    assert len(a & b) / len(a | b) >= placey_ai.SIMILARITY_THRESHOLD
