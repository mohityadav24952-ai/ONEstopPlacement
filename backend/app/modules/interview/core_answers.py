"""Locally saved answers for the core-subject master list (OS, DBMS, CN, OOP).

"View Answer" in the prep UI shows these with zero API calls; "Ask Placey" (Gemini) stays available as a
second, optional step for a deeper explanation or a follow-up.

The answers live in data/core_answers.json, one per master question, keyed by topic and the question's index
in core_master.RAW. They were written once, offline (see the file's "generated_by"), not by the app's runtime
AI. If a master question is edited without updating its answer, the lookup simply returns None for it and the
UI falls back to Ask Placey; tests catch the drift.
"""
import json
from functools import lru_cache
from pathlib import Path

from app.modules.interview.core_master import RAW, tidy

PATH = Path(__file__).parent / "data" / "core_answers.json"


@lru_cache(maxsize=1)
def _by_text() -> dict[str, list[str]]:
    data = json.loads(PATH.read_text(encoding="utf-8"))
    out: dict[str, list[str]] = {}
    for row in data["answers"]:
        lines = RAW.get(row["topic"], [])
        if row["index"] >= len(lines) or tidy(lines[row["index"]]) != row["question"]:
            continue  # the master list changed under this answer: do not show a mismatched answer
        out[row["question"]] = [str(x) for x in row["answer"]]
    return out


def answer_for(question_text: str) -> list[str] | None:
    """The saved answer for a master-list question (by its stored, un-paraphrased text)."""
    return _by_text().get(question_text)


def source_note() -> str:
    return json.loads(PATH.read_text(encoding="utf-8")).get("generated_by", "")
