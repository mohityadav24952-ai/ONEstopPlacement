"""Feedback and bug reports from the Settings page."""
from sqlalchemy import select

from app.db.models.feedback import Feedback

URL = "/api/v1/feedback"


def test_feedback_is_saved_with_the_senders_email(client, session_factory):
    r = client.http.post(URL, json={"kind": "bug", "text": "  The deploy button spins forever on mobile.  ", "page": "/settings"})
    assert r.status_code == 201, r.text
    assert r.json()["id"] and r.json()["created_at"]
    with session_factory() as db:
        row = db.scalars(select(Feedback)).one()
    assert (row.kind, row.email, row.page) == ("bug", "user-a@example.com", "/settings")
    assert row.feedback_text == "The deploy button spins forever on mobile."  # surrounding spaces trimmed


def test_feedback_defaults_to_general_feedback(client):
    assert client.http.post(URL, json={"text": "Love the Neon template, more please!"}).status_code == 201


def test_feedback_rejects_empty_short_long_and_unknown_input(client):
    for body in ({"text": "          "}, {"text": "too short"}, {"text": "x" * 4001},
                 {"text": "A perfectly fine message.", "kind": "spam"},
                 {"text": "A perfectly fine message.", "user_id": "someone-else"}):
        assert client.http.post(URL, json=body).status_code == 422, body


def test_feedback_is_rate_limited(client):
    for _ in range(5):
        assert client.http.post(URL, json={"text": "Feedback number something."}).status_code == 201
    r = client.http.post(URL, json={"text": "One message too many."})
    assert r.status_code == 429 and r.json()["error"]["details"]["retry_after_seconds"] > 0


def test_feedback_is_in_the_export_and_deleted_with_the_account(client, session_factory):
    client.http.post(URL, json={"text": "Please add a dark PDF template."})
    exported = client.http.post("/api/v1/me/export").json()
    assert [f["text"] for f in exported["feedback"]] == ["Please add a dark PDF template."]
    client.as_user("user-b")
    client.http.post(URL, json={"text": "Someone else's feedback stays."})
    client.as_user("user-a")
    assert client.http.request("DELETE", "/api/v1/me", json={"confirm": "DELETE MY ACCOUNT"}).status_code == 204
    with session_factory() as db:
        assert [f.feedback_text for f in db.scalars(select(Feedback))] == ["Someone else's feedback stays."]


def test_feedback_db_failure_returns_a_readable_error_with_cors(client, session_factory):
    # e.g. the feedbacks migration not applied: the browser must get a real message, not a CORS-less 500
    # that it reports as "Could not reach the server".
    from sqlalchemy import text

    with session_factory() as db:
        db.execute(text("DROP TABLE feedbacks"))
        db.commit()
    r = client.http.post(URL, json={"text": "This should fail gracefully."}, headers={"Origin": "http://localhost:3000"})
    assert r.status_code == 503 and r.json()["error"]["code"] == "FEEDBACK_UNAVAILABLE"
    assert r.headers.get("access-control-allow-origin") == "http://localhost:3000"
