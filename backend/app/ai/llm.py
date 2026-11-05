"""Provider-neutral LLM client. Workflows only ever see `LLMClient`."""
import json
import logging
from dataclasses import dataclass, field
from typing import Any, Protocol

import httpx

from app.core.config import Settings, get_settings

logger = logging.getLogger("app.ai")


class LLMError(Exception):
    """A provider problem. `category` matches the AIRun failure categories."""

    def __init__(self, category: str, message: str = "") -> None:
        super().__init__(message or category)
        self.category = category


@dataclass
class LLMRequest:
    workflow: str
    system: str
    user: str
    # The structured input the prompt was rendered from. Real providers ignore it;
    # the mock adapter reads it so it can answer deterministically.
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass
class LLMResponse:
    text: str
    tokens_in: int = 0
    tokens_out: int = 0
    model: str = ""


class LLMClient(Protocol):
    provider: str
    model: str

    def generate_json(self, request: LLMRequest) -> LLMResponse: ...


def _post(url: str, headers: dict[str, str], body: dict, timeout: int) -> dict:
    try:
        response = httpx.post(url, headers=headers, json=body, timeout=timeout)
    except httpx.TimeoutException:
        raise LLMError("TIMEOUT") from None
    except httpx.HTTPError:
        raise LLMError("PROVIDER_ERROR", "network") from None
    if response.status_code == 429:
        raise LLMError("RATE_LIMIT")
    if response.status_code >= 400:
        # Status only: provider error bodies can echo prompt content.
        raise LLMError("PROVIDER_ERROR", f"status {response.status_code}")
    try:
        return response.json()
    except ValueError:
        raise LLMError("INVALID_JSON", "provider body") from None


class OpenAIClient:
    provider = "openai"

    def __init__(self, api_key: str, model: str, timeout: int) -> None:
        self.api_key, self.model, self.timeout = api_key, model or "gpt-4o-mini", timeout

    def generate_json(self, request: LLMRequest) -> LLMResponse:
        data = _post(
            "https://api.openai.com/v1/chat/completions",
            {"Authorization": f"Bearer {self.api_key}"},
            {
                "model": self.model,
                "temperature": 0,
                "response_format": {"type": "json_object"},
                "messages": [
                    {"role": "system", "content": request.system},
                    {"role": "user", "content": request.user},
                ],
            },
            self.timeout,
        )
        try:
            usage = data.get("usage", {})
            return LLMResponse(
                text=data["choices"][0]["message"]["content"],
                tokens_in=usage.get("prompt_tokens", 0),
                tokens_out=usage.get("completion_tokens", 0),
                model=self.model,
            )
        except (KeyError, IndexError, TypeError):
            raise LLMError("INVALID_JSON", "unexpected shape") from None


class GeminiClient:
    provider = "gemini"

    def __init__(self, api_key: str, model: str, timeout: int) -> None:
        self.api_key, self.model, self.timeout = api_key, model or "gemini-2.0-flash", timeout

    def generate_json(self, request: LLMRequest) -> LLMResponse:
        data = _post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent",
            {"x-goog-api-key": self.api_key},
            {
                "systemInstruction": {"parts": [{"text": request.system}]},
                "contents": [{"role": "user", "parts": [{"text": request.user}]}],
                "generationConfig": {
                    "temperature": 0,
                    "responseMimeType": "application/json",
                },
            },
            self.timeout,
        )
        try:
            usage = data.get("usageMetadata", {})
            return LLMResponse(
                text=data["candidates"][0]["content"]["parts"][0]["text"],
                tokens_in=usage.get("promptTokenCount", 0),
                tokens_out=usage.get("candidatesTokenCount", 0),
                model=self.model,
            )
        except (KeyError, IndexError, TypeError):
            raise LLMError("INVALID_JSON", "unexpected shape") from None


def build_client(settings: Settings) -> LLMClient:
    provider = settings.llm_provider.lower()
    if provider == "openai" and settings.openai_api_key:
        return OpenAIClient(settings.openai_api_key, settings.llm_model, settings.llm_timeout_seconds)
    if provider == "gemini" and settings.gemini_api_key:
        return GeminiClient(settings.gemini_api_key, settings.llm_model, settings.llm_timeout_seconds)
    from app.ai.mock import MockLLM

    return MockLLM()  # no key configured (or provider=mock)


def get_llm_client() -> LLMClient:
    """FastAPI dependency. Tests override it."""
    return build_client(get_settings())


def parse_json_object(text: str) -> dict:
    try:
        value = json.loads(text)
    except (TypeError, ValueError):
        raise LLMError("INVALID_JSON") from None
    if not isinstance(value, dict):
        raise LLMError("INVALID_JSON")
    return value


class GeminiChain:
    """Gemini Pro first, then cheaper models, so Ask Placey keeps working when a key has no quota
    for Pro or a preview model is retired. `.model` is the model that actually answered (it is what
    the audit row and the cache record)."""

    provider = "gemini"

    def __init__(self, api_key: str, models: list[str], timeout: int) -> None:
        self.api_key, self.models, self.timeout = api_key, models, timeout
        self.model = models[0]

    def generate_json(self, request: LLMRequest) -> LLMResponse:
        last: LLMError | None = None
        for name in self.models:
            try:
                response = GeminiClient(self.api_key, name, self.timeout).generate_json(request)
            except LLMError as exc:
                if exc.category not in ("RATE_LIMIT", "PROVIDER_ERROR", "TIMEOUT"):
                    raise  # a bad reply is not a reason to ask another model
                logger.warning("Gemini model %s unavailable (%s), trying the next", name, exc.category)
                last = exc
                continue
            self.model = name
            return response
        assert last is not None
        raise last


def get_placey_llm() -> LLMClient:
    """FastAPI dependency for "Ask Placey": Gemini Pro (with fallbacks) whenever GEMINI_API_KEY is
    set, whatever the general LLM_PROVIDER says. With no key it falls back to the normal client (the
    demo mock). Tests override it."""
    settings = get_settings()
    if settings.gemini_api_key:
        models = [settings.placey_model, *[m.strip() for m in settings.placey_fallback_models.split(",") if m.strip()]]
        return GeminiChain(settings.gemini_api_key, list(dict.fromkeys(models)), settings.placey_model_timeout)
    return build_client(settings)
