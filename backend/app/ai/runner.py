"""Runs one structured AI workflow: render prompt, call, validate, retry once, audit."""
import hashlib
import json
import logging
import time
import uuid
from collections.abc import Callable
from pathlib import Path
from typing import TypeVar

from pydantic import BaseModel, ValidationError
from sqlalchemy.orm import Session

from app.ai.llm import LLMClient, LLMError, LLMRequest, parse_json_object
from app.core.errors import AppError
from app.db.models.resume import AIRun

logger = logging.getLogger("app.ai")
PROMPT_DIR = Path(__file__).parent / "prompts"
T = TypeVar("T", bound=BaseModel)


def load_prompt(name: str) -> tuple[str, str]:
    """Prompts are versioned files: <workflow>_v<N>.txt = system, a '---' line, user template."""
    system, _, user = (PROMPT_DIR / f"{name}.txt").read_text(encoding="utf-8").partition("\n---\n")
    return system.strip(), user.strip()


def render_data(payload: dict) -> str:
    body = json.dumps(payload, ensure_ascii=False, sort_keys=True)
    body = body.replace("</data", "<\\/data")  # untrusted text cannot close the data block
    return f"<data>\n{body}\n</data>"


def input_hash(payload: dict) -> str:
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()


def _record(db, profile_id, workflow, version, client, payload, status, category, tin, tout, ms):
    db.add(
        AIRun(
            profile_id=profile_id,
            workflow=workflow,
            prompt_version=version,
            provider=client.provider,
            model_id=client.model,
            input_hash=input_hash(payload),
            tokens_in=tin,
            tokens_out=tout,
            latency_ms=ms,
            status=status,
            failure_category=category,
        )
    )
    db.commit()


def run_structured(
    db: Session,
    profile_id: uuid.UUID,
    client: LLMClient,
    workflow: str,
    version: str,
    payload: dict,
    schema: type[T],
    validate: Callable[[T], T] | None = None,
) -> T:
    system, user_template = load_prompt(f"{workflow}_{version}")
    user = user_template.replace("{data}", render_data(payload))
    tin = tout = 0
    started = time.monotonic()
    category = "SCHEMA_VIOLATION"

    for attempt in range(2):
        prompt = user if attempt == 0 else f"{user}\n\nYour previous reply was rejected ({category}). Reply again with valid JSON matching the schema only."
        try:
            response = client.generate_json(
                LLMRequest(workflow=workflow, system=system, user=prompt, payload=payload)
            )
            tin += response.tokens_in
            tout += response.tokens_out
            parsed = schema.model_validate(parse_json_object(response.text))
            if validate:
                parsed = validate(parsed)
        except LLMError as exc:
            category = exc.category
            if category in ("TIMEOUT", "RATE_LIMIT", "PROVIDER_ERROR"):
                break  # retrying would not change the outcome
            continue
        except ValidationError:
            category = "SCHEMA_VIOLATION"
            continue
        except ValueError:  # raised by the code validator
            category = "VALIDATOR_REJECTED"
            continue
        _record(db, profile_id, workflow, version, client, payload, "OK", None, tin, tout,
                int((time.monotonic() - started) * 1000))
        return parsed

    _record(db, profile_id, workflow, version, client, payload, "FAILED", category, tin, tout,
            int((time.monotonic() - started) * 1000))
    logger.warning("AI workflow %s failed: %s", workflow, category)  # category only, no content
    if category in ("TIMEOUT", "RATE_LIMIT", "PROVIDER_ERROR"):
        raise AppError("AI_UNAVAILABLE", "The AI service is unavailable right now. Try again shortly.", 503,
                       {"category": category})
    raise AppError("AI_OUTPUT_INVALID", "The AI returned something we could not use. You can enter this manually.", 502)
