from urllib.parse import urlparse

from app.modules.interview import dsa_links, hynts
from app.modules.interview.fallback_dsa import FALLBACK_DSA

BODY = {"company": "Amazon", "role": "Backend Intern", "duration_days": 30}


def _session(client, **over):
    r = client.http.post("/api/v1/interview/sessions", json={**BODY, **over})
    assert r.status_code == 201, r.text
    return r.json()


def _dsa_days(s):
    return [d for d in s["days"] if d["topic"] == "DSA"]


def test_hynts_mapping_known_aliases_and_unknowns():
    assert hynts.hynts_url("Amazon") == "https://hynts.in/preparation/company-wise-dsa-sheet/amazon-dsa-interview-questions/"
    assert hynts.hynts_url("Goldman Sachs").endswith("/goldman-sachs-dsa-interview-questions/")
    assert hynts.hynts_url("JP Morgan").endswith("/jpmorgan-chase-dsa-interview-questions/")
    assert hynts.hynts_url("Facebook").endswith("/meta-dsa-interview-questions/")
    assert hynts.hynts_url("Google Inc.").endswith("/google-dsa-interview-questions/")
    assert hynts.hynts_url("Metaverse Labs") is None  # whole-word matching only
    assert hynts.hynts_url("Acme") is None and hynts.hynts_url("") is None and hynts.hynts_url(None) is None


def test_fallback_list_is_the_supplied_100_with_unique_links_on_allowed_hosts():
    assert len(FALLBACK_DSA) == 100
    assert len({u for _, u in FALLBACK_DSA}) == 100
    assert FALLBACK_DSA[0] == ("Two Sum", "https://leetcode.com/problems/two-sum/")
    assert FALLBACK_DSA[-1] == ("Middle Of Linked List", "https://www.naukri.com/code360/problems/middle-of-linked-list_973250")
    assert {urlparse(u).netloc for _, u in FALLBACK_DSA} <= set(dsa_links.ALLOWED)


def test_hynts_company_has_no_empty_dsa_days_and_links_to_its_sheet(client):
    s = _session(client)
    assert s["dsa_backfill"]["source"] == "hynts" and s["dsa_backfill"]["days"]
    for d in _dsa_days(s):
        assert d["questions"], f"day {d['day']} is empty"
    hy = [q for d in _dsa_days(s) for q in d["questions"] if urlparse(q["sources"][0]["url"]).netloc == "hynts.in"]
    assert hy and all(q["sources"][0]["url"] == hynts.hynts_url("Amazon") for q in hy)
    assert len({q["id"] for q in hy}) == len(hy)  # one row per day, so progress is per day
    assert s["progress"]["total"] > 0 and "DSA" not in s["topics_without_questions"]


def test_company_not_on_hynts_gets_4_to_5_mixed_fallback_questions_per_day(client):
    s = _session(client, company="Acme Robotics")
    assert s["dsa_backfill"]["source"] == "fallback" and not s["dsa_backfill"]["company_on_hynts"]
    filled = set(s["dsa_backfill"]["days"])
    assert filled
    known = {u for _, u in FALLBACK_DSA}
    seen = []
    for d in _dsa_days(s):
        if d["day"] in filled:
            assert 4 <= len(d["questions"]) <= 5
            for q in d["questions"]:
                assert q["sources"][0]["url"] in known
                seen.append(q["sources"][0]["url"])
    assert len(seen) == len(set(seen))  # a problem is never repeated within a plan
    assert len({urlparse(u).netloc for u in seen}) > 1  # mixed platforms across the fill


def test_short_plans_are_untouched(client):
    s = _session(client, duration_days=3)
    assert s["dsa_backfill"]["source"] is None


def test_fallback_runs_out_honestly_instead_of_repeating(client):
    s = _session(client, company="Acme Robotics", duration_days=60)
    seen = [q["sources"][0]["url"] for d in _dsa_days(s) for q in d["questions"] if q["sources"][0]["url"] in {u for _, u in FALLBACK_DSA}]
    assert len(seen) == len(set(seen)) <= 100
