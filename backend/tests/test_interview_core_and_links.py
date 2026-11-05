import json
import re
from urllib.parse import urlparse

from app.ai.llm import LLMResponse, get_llm_client
from app.modules.interview import dsa_links, planner
from app.modules.interview.core_master import CORE_TOPICS, RAW, master_questions, tidy
from app.modules.interview.paraphrase import paraphrase

BODY = {"company": "Google", "role": "Backend Intern", "duration_days": 14}
CORE = set(CORE_TOPICS)
STOP = {"what", "does", "difference", "between", "explain", "define", "mean", "different", "types", "type", "about", "tell", "also", "cover",
        "describe", "would", "this", "that", "with", "from", "your", "have", "differ", "compare", "causes", "occur", "walk", "through", "main"}


def words(text):
    return {w for w in re.findall(r"[a-z0-9]+", text.lower()) if len(w) >= 4 and w not in STOP}


# ---------------- the master list ----------------
def test_master_list_is_complete_and_clean():
    qs = master_questions()
    counts = {t: sum(1 for q in qs if q[0] == t) for t in RAW}
    assert counts == {"OS": 28, "DBMS": 31, "CN": 25, "OOP": 25} and len(qs) == 109
    assert len({q[2] for q in qs}) == 109  # no duplicates
    for _, _, text in qs:
        assert text.endswith(("?", ".")), text
        assert not re.search(r"\s[?,.]|\?\.|\.\?|\?\?|\.\.|VVVV|very very|might be asked", text), text


def test_tidy_cleans_the_awkward_source_lines():
    assert tidy("What is RAID ? Different types. ") == "What is RAID? Different types."
    assert tidy("ACID properties (VVVVV IMP) ") == "Explain ACID properties."
    assert tidy("Why does trashing occur? ") == "Why does thrashing occur?"
    assert tidy("Hub vs Switch ") == "What is the difference between Hub and Switch?"
    assert tidy("Diff between TRUNCATE and DELETE command .. ") == "Difference between TRUNCATE and DELETE command."
    assert tidy("What is CCP ? (Concurrency Control Protocols) ") == "What is CCP (Concurrency Control Protocols)?"
    assert tidy("What is JOIN .. Explain types of JOINs ") == "What is JOIN? Explain types of JOINs."
    assert tidy("What is Method Overloading vs. Method Overriding?") == "What is the difference between Method Overloading and Method Overriding?"
    assert tidy("Practice sql queries from leetcode") == "Practice SQL queries from LeetCode."


# ---------------- paraphrasing ----------------
def test_paraphrase_is_deterministic_and_seed_dependent():
    q = "What is a deadlock?"
    assert paraphrase(q, 7, "k") == paraphrase(q, 7, "k")
    assert len({paraphrase(q, seed, "k") for seed in range(40)}) > 1


def test_paraphrase_never_drops_the_subject_terms():
    for _, _, text in master_questions():
        for seed in range(25):
            out = paraphrase(text, seed, key=text)
            assert out.endswith(("?", ".")), (text, out)
            missing = words(text) - words(out)
            assert not missing, f"{text!r} -> {out!r} lost {missing}"


def test_paraphrase_actually_rewords_many_questions():
    changed = sum(1 for _, _, t in master_questions() if any(paraphrase(t, s, t) != t for s in range(10)))
    assert changed >= 80


def test_paraphrase_leaves_odd_shapes_alone():
    for text in ("What happens when you enter “google.com”?", "What is paging and why do we need it?", "Practice SQL queries from LeetCode.", "What does ping command do?"):
        assert all(paraphrase(text, s) == text for s in range(10)), text


# ---------------- DSA link cards ----------------
def test_dsa_cards_are_company_specific_links_on_known_hosts_only():
    cards = dsa_links.dsa_cards("Google Inc.", "Backend Intern", year=2026)
    assert 12 <= len(cards) <= 40
    for c in cards:
        u = urlparse(c["url"])
        assert u.scheme == "https" and u.netloc in dsa_links.ALLOWED, c["url"]
        assert c["button"] and c["title"] and c["platform"] in ("LEETCODE", "GEEKSFORGEEKS", "CODE360")
    assert len({c["url"] for c in cards}) == len(cards)
    blob = " ".join(c["url"].lower() for c in cards)
    assert "google" in blob and "2026" in blob and "backend" in blob
    assert {"LEETCODE", "GEEKSFORGEEKS", "CODE360"} <= {c["platform"] for c in cards}
    assert any(c["button"] == "Solve on LeetCode" for c in cards) and any(c["button"] == "Solve on GFG" for c in cards)


def test_dsa_cards_change_with_company_and_role():
    a = {c["url"] for c in dsa_links.dsa_cards("Google", "Backend", 2026)}
    b = {c["url"] for c in dsa_links.dsa_cards("Amazon", "Backend", 2026)}
    c = {c["url"] for c in dsa_links.dsa_cards("Google", "Data Analyst", 2026)}
    assert not a & {u for u in b if "google" in u.lower()} and a != b and a != c


def test_dsa_cards_unknown_company_still_gets_search_links_without_a_leetcode_company_page():
    cards = dsa_links.dsa_cards("Zebra Widgets", "Intern", 2026)
    assert cards and not any("/company/" in c["url"] and "leetcode" in c["url"] for c in cards)


def test_dsa_cards_hostile_input_cannot_leave_the_hosts():
    for c in dsa_links.dsa_cards('x&evil=1#f" onmouseover="a(1)', 'a"b<script>', 2026):
        u = urlparse(c["url"])
        assert u.netloc in dsa_links.ALLOWED and '"' not in c["url"] and "<" not in c["url"] and not u.fragment and " " not in c["url"]


def test_dsa_cards_empty_without_a_company():
    assert dsa_links.dsa_cards("", "x") == [] and dsa_links.dsa_cards(None, None) == []


# ---------------- planner ----------------
def _refs():
    out = []
    for t in ("OS", "DBMS", "CN", "OOP", "HR", "DSA"):
        for i in range(30):
            diff = "MEDIUM" if t == "DSA" else ("EASY" if i % 2 else "MEDIUM")  # link cards all share one difficulty
            out.append(planner.QuestionRef(f"{t}-{i:02d}", t, diff, f"{t} question {i}", position=i))
    return out


def test_planner_same_seed_same_plan_new_seed_new_core_order():
    w = {"OS": 2, "DBMS": 2, "CN": 2, "OOP": 2, "HR": 1, "DSA": 3}
    assert planner.build_plan(_refs(), w, 14, seed=5) == planner.build_plan(list(reversed(_refs())), w, 14, seed=5)
    a = planner.build_plan(_refs(), w, 14, seed=1)
    b = planner.build_plan(_refs(), w, 14, seed=2)
    core = lambda p: [d["question_ids"] for d in p["days"] if d["topic"] in planner.SHUFFLED_TOPICS]
    assert core(a) != core(b)


def test_planner_seed_never_reorders_dsa_or_hr():
    w = {"OS": 2, "HR": 2, "DSA": 3}
    pick = lambda p, t: [d["question_ids"] for d in p["days"] if d["topic"] == t]
    a, b = planner.build_plan(_refs(), w, 10, seed=1), planner.build_plan(_refs(), w, 10, seed=999)
    assert pick(a, "DSA") == pick(b, "DSA") and pick(a, "HR") == pick(b, "HR")
    # DSA cards stay in the order they were built
    flat = [i for ids in pick(a, "DSA") for i in ids]
    assert flat == sorted(flat)


# ---------------- sessions ----------------
def _session(client, **over):
    r = client.http.post("/api/v1/interview/sessions", json={**BODY, **over})
    assert r.status_code == 201, r.text
    return r.json()


def test_dsa_days_contain_only_link_cards_never_plain_text_problems(client):
    s = _session(client)
    dsa = [q for d in s["days"] if d["topic"] == "DSA" for q in d["questions"]]
    assert dsa
    for q in dsa:
        assert q["format"] == "link"
        assert q["sources"] and q["sources"][0]["url"].startswith("https://") and q["sources"][0]["title"]
        assert urlparse(q["sources"][0]["url"]).netloc in dsa_links.ALLOWED
    text = " ".join(q["text"].lower() for q in dsa)
    assert "reverse a singly linked list" not in text and "two numbers in an array" not in text  # the old hardcoded ones are gone


def test_dsa_cards_follow_the_chosen_company_and_role(client):
    g = _session(client, company="Google", role="Backend Intern")
    a = _session(client, company="Amazon", role="Data Analyst")
    urls = lambda s: " ".join(q["sources"][0]["url"].lower() for d in s["days"] if d["topic"] == "DSA" for q in d["questions"])
    assert "google" in urls(g) and "amazon" not in urls(g)
    assert "amazon" in urls(a) and "google" not in urls(a)


def test_core_days_only_use_master_questions_and_keep_the_original_wording(client):
    s = _session(client)
    master = {q[2] for q in master_questions()}
    core = [q for d in s["days"] if d["topic"] in CORE for q in d["questions"]]
    assert core
    for q in core:
        assert q["original_text"] in master
        assert q["text"].endswith(("?", "."))
    assert any(q["text"] != q["original_text"] for q in core)  # at least some are re-worded


def test_the_old_plain_text_questions_are_retired(client):
    client.http.post("/api/v1/interview/sessions", json=BODY)
    listed = client.http.get("/api/v1/interview/questions?topic=DSA&limit=50").json()
    assert listed == []  # no DSA text questions are served at all
    os_texts = {q["text"] for q in client.http.get("/api/v1/interview/questions?topic=OS&limit=50").json()}
    assert "What is the difference between a process and a thread?" not in os_texts


def test_plan_reads_the_same_every_time_it_is_opened(client):
    s = _session(client)
    again = client.http.get(f"/api/v1/interview/sessions/{s['id']}").json()
    texts = lambda x: [[q["text"] for q in d["questions"]] for d in x["days"]]
    assert texts(s) == texts(again)


def test_two_plans_do_not_read_alike(client):
    runs = [_session(client) for _ in range(3)]
    flat = lambda s: tuple(q["text"] for d in s["days"] if d["topic"] in CORE for q in d["questions"])
    assert len({flat(r) for r in runs}) > 1


def test_done_works_on_link_cards(client):
    s = _session(client)
    card = next(q for d in s["days"] if d["topic"] == "DSA" for q in d["questions"])
    r = client.http.put(f"/api/v1/interview/sessions/{s['id']}/questions/{card['id']}", json={"state": "DONE"})
    assert r.status_code == 200 and r.json()["progress"]["done"] == 1


def test_ai_cannot_write_dsa_problem_text(client):
    s = _session(client)
    r = client.http.post(f"/api/v1/interview/sessions/{s['id']}/generate", json={"topic": "DSA", "count": 2})
    assert r.status_code == 422 and r.json()["error"]["code"] == "INVALID_TOPIC"


# ---------------- Ask Placey ----------------
def _pick(s, predicate):
    return next(q for d in s["days"] for q in d["questions"] if predicate(d["topic"], q))


def test_ask_placey_core_question_gets_a_short_answer(client):
    s = _session(client)
    q = _pick(s, lambda t, q: t in CORE)
    r = client.http.post(f"/api/v1/interview/sessions/{s['id']}/questions/{q['id']}/ask-placey")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["kind"] == "answer" and 3 <= len(body["lines"]) <= 6
    assert body["mock"] is True  # no AI key in tests: it must say so
    assert "no live web access" in body["disclaimer"]
    assert urlparse(body["read_more"]["url"]).netloc == "www.geeksforgeeks.org"


def test_ask_placey_hr_question_gets_guidance_not_an_answer(client):
    s = _session(client)
    q = _pick(s, lambda t, q: t == "HR")
    body = client.http.post(f"/api/v1/interview/sessions/{s['id']}/questions/{q['id']}/ask-placey").json()
    assert body["kind"] == "guidance" and "lines" not in body
    assert 2 <= len(body["hints"]) <= 4 and 3 <= len(body["values"]) <= 5
    assert set(body["star"]) == {"situation", "task", "action", "result"}
    assert "Google" in body["values_note"] and "not claims about Google" in body["values_note"]


def test_ask_placey_refused_for_dsa_cards_and_for_other_users_and_unknown_questions(client):
    s = _session(client)
    card = _pick(s, lambda t, q: t == "DSA")
    assert client.http.post(f"/api/v1/interview/sessions/{s['id']}/questions/{card['id']}/ask-placey").status_code == 422
    core = _pick(s, lambda t, q: t in CORE)
    assert client.http.post(f"/api/v1/interview/sessions/{s['id']}/questions/00000000-0000-0000-0000-000000000000/ask-placey").status_code == 404
    client.as_user("user-b")
    assert client.http.post(f"/api/v1/interview/sessions/{s['id']}/questions/{core['id']}/ask-placey").status_code == 404


def test_ask_placey_cleans_model_output_and_rejects_bad_shapes(app, client):
    class Fake:
        provider, model = "t", "t"
        reply: dict = {}

        def generate_json(self, req):
            return LLMResponse(text=json.dumps(Fake.reply))

    app.dependency_overrides[get_llm_client] = lambda: Fake()
    s = _session(client)
    q = _pick(s, lambda t, q: t in CORE)
    url = f"/api/v1/interview/sessions/{s['id']}/questions/{q['id']}/ask-placey"

    Fake.reply = {"lines": ["- A process is a running program.", "* It has its own address space.", "1. Threads share it.", "  ", "**Bold** end."]}
    ok = client.http.post(url).json()
    assert ok["mock"] is False and ok["lines"] == ["A process is a running program.", "It has its own address space.", "Threads share it.", "Bold end."]

    Fake.reply = {"lines": ["only one", "two"]}  # too few -> safe failure, nothing shown
    bad = client.http.post(url)
    assert bad.status_code == 502 and bad.json()["error"]["code"] == "AI_OUTPUT_INVALID"
    Fake.reply = {"lines": ["a"] * 9}
    assert client.http.post(url).status_code == 502
