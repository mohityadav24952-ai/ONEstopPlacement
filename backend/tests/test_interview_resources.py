import re
from urllib.parse import parse_qs, urlparse

from app.modules.interview import resources as R

ALL_TOPICS = ["DSA", "OOP", "DBMS", "OS", "CN", "HR", "PROJECT"]


def _all(d):
    return d["company_resources"] + d["topic_resources"]


def test_company_name_is_cleaned():
    assert R.clean_company("Google Inc.") == "google"
    assert R.clean_company("  TCS Pvt. Ltd ") == "tcs"
    assert R.clean_company("Goldman  Sachs") == "goldman sachs"
    assert R.clean_company("") == "" and R.clean_company(None) == ""


def test_every_topic_has_links_and_only_trusted_hosts():
    for topic in ALL_TOPICS:
        d = R.build_resources("Acme", topic)
        assert d["topic_resources"], topic
        for r in _all(d):
            u = urlparse(r["url"])
            assert u.scheme == "https" and u.netloc in R.ALLOWED_HOSTS, r["url"]
            assert r["source"] in ("GEEKSFORGEEKS", "LEETCODE")


def test_ids_are_unique_within_a_response():
    d = R.build_resources("Google", "DSA", "Dynamic programming")
    ids = [r["id"] for r in _all(d)]
    assert len(ids) == len(set(ids))


def test_no_company_means_no_company_links():
    d = R.build_resources(None, "DBMS")
    assert d["company_resources"] == [] and d["company"] is None and d["topic_resources"]


def test_no_topic_means_no_topic_links():
    d = R.build_resources("Google", None)
    assert d["topic_resources"] == [] and d["company_resources"]


def test_leetcode_company_page_only_for_known_companies():
    known = {r["id"] for r in R.company_resources("Google")}
    unknown = {r["id"] for r in R.company_resources("Zebra Widgets")}
    assert "lc-company-tag" in known
    assert "lc-company-tag" not in unknown and "lc-company-discuss" in unknown  # generic search still offered


def test_meta_maps_to_leetcode_facebook_slug():
    url = next(r["url"] for r in R.company_resources("Meta") if r["id"] == "lc-company-tag")
    assert url == "https://leetcode.com/company/facebook/"


def test_hostile_company_text_cannot_break_out_of_the_url():
    nasty = 'x&evil=1#frag" onmouseover="alert(1)//../..'
    d = R.build_resources(nasty, "DSA")
    for r in _all(d):
        u = urlparse(r["url"])
        assert u.netloc in R.ALLOWED_HOSTS and not u.fragment, r["url"]
        assert "evil" not in parse_qs(u.query) and '"' not in r["url"] and " " not in r["url"]
    # the cleaned company is words only
    assert re.fullmatch(r"[a-z0-9 ]*", d["company"] or "")


def test_unicode_and_long_input_are_safe():
    d = R.build_resources("Gøøgle " + "a" * 500, "OS")
    assert len(d["company"]) <= 60
    for r in _all(d):
        r["url"].encode("ascii")  # fully percent-encoded


def test_company_in_search_urls_is_encoded_not_raw():
    r = next(x for x in R.company_resources("Goldman Sachs") if x["id"] == "gfg-company-search")
    assert r["url"] == "https://www.geeksforgeeks.org/search/?q=goldman+sachs+interview+experience"
    r = next(x for x in R.company_resources("Goldman Sachs") if x["id"] == "lc-company-discuss")
    assert r["url"].endswith("query=goldman%20sachs")


def test_dsa_subtopic_picks_the_matching_leetcode_tag():
    d = R.build_resources("Acme", "DSA", "Dynamic Programming")
    urls = [r["url"] for r in d["topic_resources"]]
    assert "https://leetcode.com/tag/dynamic-programming/" in urls
    assert "https://www.geeksforgeeks.org/dsa/dynamic-programming/" in urls
    assert "https://leetcode.com/tag/array/" not in urls  # focused, not the whole list


def test_dsa_without_a_known_subtopic_shows_the_main_tags():
    urls = [r["url"] for r in R.build_resources("Acme", "DSA", "Something odd")["topic_resources"] if r["id"].startswith("lc-tag")]
    assert 3 <= len(urls) <= 8


def test_extra_tag_outside_the_default_list_is_still_linked():
    d = R.build_resources("Acme", "DSA", "Backtracking basics")
    assert "https://leetcode.com/tag/backtracking/" in [r["url"] for r in d["topic_resources"]]


def test_response_carries_the_not_reviewed_disclaimer():
    note = R.build_resources("Acme", "DSA")["note"].lower()
    assert "third-party" in note and "not reviewed" in note and "claimed" in note


# ---- the HTTP route ----
def test_route_returns_resources(client):
    r = client.http.get("/api/v1/interview/resources", params={"company": "Google", "topic": "DSA", "subtopic": "dynamic programming"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["company"] == "google" and body["company_resources"] and body["topic_resources"]


def test_route_rejects_bad_topic_and_oversized_input(client):
    assert client.http.get("/api/v1/interview/resources", params={"topic": "NOPE"}).status_code in (400, 422)
    assert client.http.get("/api/v1/interview/resources", params={"company": "x" * 500}).status_code in (400, 422)


def test_route_works_with_no_params(client):
    r = client.http.get("/api/v1/interview/resources")
    assert r.status_code == 200 and r.json()["company_resources"] == [] and r.json()["topic_resources"] == []
