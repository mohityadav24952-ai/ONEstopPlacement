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
    llm_timeout_seconds: int = 60
    # Local-disk file storage for development.
    storage_dir: str = "storage"
    max_upload_mb: int = 5
    # Minimum minutes between refreshes of one platform account.
    refresh_cooldown_minutes: int = 15

    @field_validator("database_url")
    @classmethod
    def use_psycopg_driver(cls, value: str) -> str:
        value = value.strip()
        for prefix in ("postgres://", "postgresql://"):
            if value.startswith(prefix):
                return "postgresql+psycopg://" + value[len(prefix):]
        return value

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
        return f"{self.supabase_url}/auth/v1/jwks"

    @property
    def jwt_issuer(self) -> str:
        return f"{self.supabase_url}/auth/v1"


@lru_cache
def get_settings() -> Settings:
    return Settings()