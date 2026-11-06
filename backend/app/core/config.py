from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    app_name: str = "ONEstopPlacement API"
    environment: str = "development"
    log_level: str = "INFO"
    cors_allowed_origins: str = "http://localhost:3000"
    database_url: str = ""
    supabase_url: str = ""
    # Optional server-held token that raises GitHub public-read limits (60 -> 5000/h).
    github_token: str = ""
    # LOCAL DEVELOPMENT ONLY. Accepts the fixed token "dev-token" as a signed-in dev user
    # and uses a local SQLite file instead of DATABASE_URL. Refused unless ENVIRONMENT=development.
    dev_auth_bypass: bool = False
    # AI provider: mock (default, no key needed) | openai | gemini
    llm_provider: str = "mock"
    llm_model: str = ""
    openai_api_key: str = ""
    gemini_api_key: str = ""
    # Key rotation: GEMINI_API_KEY_1 is tried first; on a 429 (quota) the next key is used.
    # A plain GEMINI_API_KEY still works and is tried after the numbered ones.
    gemini_api_key_1: str = ""
    gemini_api_key_2: str = ""
    # Last resort for resume parsing when every Gemini key fails (OpenAI-compatible API).
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"  # llama-3.x-70b models are no longer offered on Groq
    resume_parse_model: str = "gemini-3.5-flash"
    # "Ask Placey": web search (Tavily) + Gemini. Used only when a user clicks Ask Placey.
    tavily_api_key: str = ""
    # Pro first. If the key has no quota for it (or the model is retired), the next one answers.
    placey_model: str = "gemini-3.1-pro-preview"
    placey_fallback_models: str = "gemini-3.5-flash,gemini-3-flash-preview,gemini-3.1-flash-lite"
    placey_model_timeout: int = 25
    placey_search_timeout: int = 15
    # Ask Placey questions that actually reach Gemini (cache misses), per client IP per UTC day.
    # Saved (cached) answers never count. Protects the shared Gemini quota from spam.
    placey_ip_daily_limit: int = 7
    # Set to true ONLY when the API sits behind a reverse proxy you control that sets X-Forwarded-For;
    # otherwise any caller could fake the header to dodge per-IP limits.
    trust_forwarded_for: bool = False
    llm_timeout_seconds: int = 60
    # File storage. With SUPABASE_SERVICE_ROLE_KEY set, files live in the private Supabase bucket below.
    # Without it, files go to local disk, and only when ENVIRONMENT=development.
    # The key is a SERVER secret: never expose it to the frontend or commit it.
    supabase_service_role_key: str = ""
    supabase_storage_bucket: str = "resumes"
    storage_timeout_seconds: int = 30
    storage_dir: str = "storage"
    max_upload_mb: int = 5
    # Minimum minutes between refreshes of one platform account.
    refresh_cooldown_minutes: int = 15
    # 1-click Vercel deploy of published portfolios (option A: every site is a project in ONE Vercel
    # account). VERCEL_TOKEN is a SERVER secret with full access to that account: never expose or commit it.
    # Leave VERCEL_TEAM_ID empty for a personal (Hobby) account.
    vercel_token: str = ""
    vercel_team_id: str = ""
    vercel_project_prefix: str = "osp-"
    vercel_timeout_seconds: int = 30
    # Where the Next.js app runs. The deploy fetches the same static snapshot as the ZIP export from here.
    frontend_origin: str = "http://localhost:3000"

    @field_validator("vercel_token", "vercel_team_id", "vercel_project_prefix")
    @classmethod
    def strip_vercel(cls, value: str) -> str:
        return value.strip()

    @field_validator("frontend_origin")
    @classmethod
    def strip_origin(cls, value: str) -> str:
        return value.strip().rstrip("/")

    @property
    def gemini_keys(self) -> list[str]:
        """Every configured Gemini key, in rotation order, without blanks or duplicates."""
        keys = [k.strip() for k in (self.gemini_api_key_1, self.gemini_api_key_2, self.gemini_api_key)]
        return list(dict.fromkeys(k for k in keys if k))

    @field_validator("database_url")
    @classmethod
    def use_psycopg_driver(cls, value: str) -> str:
        value = value.strip()
        for prefix in ("postgres://", "postgresql://"):
            if value.startswith(prefix):
                return "postgresql+psycopg://" + value[len(prefix):]
        return value

    @field_validator("supabase_service_role_key", "supabase_storage_bucket")
    @classmethod
    def strip_value(cls, value: str) -> str:
        return value.strip()

    @field_validator("supabase_url")
    @classmethod
    def strip_trailing_slash(cls, value: str) -> str:
        return value.strip().rstrip("/")

    @property
    def effective_database_url(self) -> str:
        if self.dev_auth_bypass:
            return "sqlite:///dev.db"
        return self.database_url

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_allowed_origins.split(",") if o.strip()]

    @property
    def jwks_url(self) -> str:
        return f"{self.supabase_url}/auth/v1/.well-known/jwks.json"

    @property
    def jwt_issuer(self) -> str:
        return f"{self.supabase_url}/auth/v1"


@lru_cache
def get_settings() -> Settings:
    return Settings()