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
    # A JSON schema the reply must follow. Providers that support structured output enforce it while
    # generating (constrained decoding), instead of only asking for it in the prompt.
    response_schema: dict[str, Any] | None = None


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


def _with_schema(call, request: LLMRequest) -> dict:
    """`call(schema)` with the request's schema; if the provider rejects the schema itself (HTTP 400, e.g. a
    model without structured-output support), once more without it. The caller validates the reply anyway."""
    if request.response_schema is None:
        return call(None)
    try:
        return call(request.response_schema)
    except LLMError as exc:
        if str(exc) != "status 400":
            raise
        logger.warning("%s: provider rejected the response schema, retrying without it", request.workflow)
        return call(None)


def _openai_format(schema: dict | None) -> dict:
    if schema is None:
        return {"type": "json_object"}
    return {"type": "json_schema", "json_schema": {"name": "response", "strict": True, "schema": schema}}


class OpenAIClient:
    provider = "openai"

    def __init__(self, api_key: str, model: str, timeout: int) -> None:
        self.api_key, self.model, self.timeout = api_key, model or "gpt-4o-mini", timeout

    url = "https://api.openai.com/v1/chat/completions"

    def generate_json(self, request: LLMRequest) -> LLMResponse:
        data = _with_schema(lambda schema: _post(
            self.url,
            {"Authorization": f"Bearer {self.api_key}"},
            {
                "model": self.model,
                "temperature": 0,
                "response_format": _openai_format(schema),
                "messages": [
                    {"role": "system", "content": request.system},
                    {"role": "user", "content": request.user},
                ],
            },
            self.timeout,
        ), request)
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
        def call(schema: dict | None) -> dict:
            config: dict[str, Any] = {"temperature": 0, "responseMimeType": "application/json"}
            if schema is not None:
                config["responseJsonSchema"] = schema
            return _post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent",
                {"x-goog-api-key": self.api_key},
                {
                    "systemInstruction": {"parts": [{"text": request.system}]},
                    "contents": [{"role": "user", "parts": [{"text": request.user}]}],
                    "generationConfig": config,
                },
                self.timeout,
            )

        data = _with_schema(call, request)
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
    if provider == "gemini" and settings.gemini_keys:
        return GeminiClient(settings.gemini_keys[0], settings.llm_model, settings.llm_timeout_seconds)
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
    for Pro or a preview model is retired. With several keys, each model is tried on every key before
    moving to the next model. `.model` is the model that actually answered (it is what the audit row
    and the cache record)."""

    provider = "gemini"

    def __init__(self, api_key: str | list[str], models: list[str], timeout: int) -> None:
        self.keys = [api_key] if isinstance(api_key, str) else list(api_key)
        self.models, self.timeout = models, timeout
        self.model = models[0]

    def generate_json(self, request: LLMRequest) -> LLMResponse:
        last: LLMError | None = None
        for name, key in ((n, k) for n in self.models for k in self.keys):
            try:
                response = GeminiClient(key, name, self.timeout).generate_json(request)
            except LLMError as exc:
                if exc.category not in ("RATE_LIMIT", "PROVIDER_ERROR", "TIMEOUT"):
                    raise  # a bad reply is not a reason to ask another model
                logger.warning("Gemini model %s unavailable (%s), trying the next", name, exc.category)
                if last is None or last.category != "RATE_LIMIT":  # a quota error anywhere is the one to report
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
    if settings.gemini_keys:
        models = [settings.placey_model, *[m.strip() for m in settings.placey_fallback_models.split(",") if m.strip()]]
        return GeminiChain(settings.gemini_keys, list(dict.fromkeys(models)), settings.placey_model_timeout)
    return build_client(settings)


class GroqClient(OpenAIClient):
    """Groq's OpenAI-compatible chat API in JSON mode."""

    provider = "groq"
    url = "https://api.groq.com/openai/v1/chat/completions"

    def __init__(self, api_key: str, model: str, timeout: int) -> None:
        super().__init__(api_key, model or "openai/gpt-oss-120b", timeout)


class ResumeParseChain:
    """Resume parsing with key rotation and a provider fallback:

      1. Gemini with GEMINI_API_KEY_1;
      2. on a 429 (quota), the same model with GEMINI_API_KEY_2 (and so on, for more keys);
      3. if Gemini fails completely (every key rate-limited, or any other provider error), Groq.

    `.provider` / `.model` report who actually answered; `.attempts` records the path (never a key).
    """

    def __init__(self, gemini_keys: list[str], gemini_model: str, groq_key: str, groq_model: str, timeout: int,
                 gemini_factory=None, groq_factory=None, gemini_fallback_models: list[str] | None = None) -> None:
        self.gemini_keys, self.gemini_model = gemini_keys, gemini_model
        # Tried with the same key when the main model is overloaded (5xx) or out of quota (429): a busy
        # model is the usual cause, and a lighter model on the same key often answers at once.
        self.gemini_models = list(dict.fromkeys([gemini_model, *(gemini_fallback_models or [])]))
        self.groq_key, self.groq_model, self.timeout = groq_key, groq_model, timeout
        self._gemini = gemini_factory or GeminiClient
        self._groq = groq_factory or GroqClient
        self.provider = "gemini" if gemini_keys else "groq"
        self.model = gemini_model if gemini_keys else groq_model
        self.attempts: list[str] = []

    def generate_json(self, request: LLMRequest) -> LLMResponse:
        last: LLMError | None = None
        give_up_on_gemini = False
        for i, key in enumerate(self.gemini_keys, start=1):
            for model in self.gemini_models:
                label = f"gemini#{i}" if model == self.gemini_model else f"gemini#{i}/{model}"
                try:
                    response = self._gemini(key, model, self.timeout).generate_json(request)
                except LLMError as exc:
                    self.attempts.append(f"{label}:{exc.category}")
                    logger.warning("resume parse: Gemini key #%d model %s failed (%s)", i, model, exc.category)
                    last = exc
                    overloaded = exc.category == "PROVIDER_ERROR" and str(exc).startswith("status 5")
                    # 404: this model name is retired or not offered to this key, a problem of the model
                    # alone, so the next model is worth trying (other 4xx would fail for every model).
                    no_such_model = exc.category == "PROVIDER_ERROR" and str(exc) == "status 404"
                    if exc.category == "RATE_LIMIT" or overloaded or no_such_model:
                        continue  # out of quota, overloaded or unknown model: next model, then next key
                    give_up_on_gemini = True  # a timeout or 4xx: other keys/models fail the same way
                    break
                self.attempts.append(f"{label}:OK")
                self.provider, self.model = "gemini", model
                return response
            if give_up_on_gemini:
                break
        if self.groq_key:
            try:
                response = self._groq(self.groq_key, self.groq_model, self.timeout).generate_json(request)
            except LLMError as exc:
                self.attempts.append(f"groq:{exc.category}")
                logger.warning("resume parse: Groq fallback failed (%s)", exc.category)
                raise
            self.attempts.append("groq:OK")
            self.provider, self.model = "groq", self.groq_model
            return response
        raise last or LLMError("PROVIDER_ERROR", "no provider configured")


def get_resume_llm() -> LLMClient:
    """FastAPI dependency for resume -> portfolio parsing: the Gemini key rotation + Groq fallback
    whenever any of those keys is set, otherwise the normal client (the demo mock, which makes the
    parser use its rule-based path). Tests override it."""
    settings = get_settings()
    if settings.gemini_keys or settings.groq_api_key:
        fallbacks = [m.strip() for m in settings.resume_parse_fallback_models.split(",") if m.strip()]
        return ResumeParseChain(settings.gemini_keys, settings.resume_parse_model, settings.groq_api_key,
                                settings.groq_model, settings.llm_timeout_seconds, gemini_fallback_models=fallbacks)
    return build_client(settings)
