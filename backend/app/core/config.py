from functools import lru_cache
from pathlib import Path
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=Path(__file__).resolve().parents[2] / ".env", extra="ignore")
    database_url: str = "postgresql+psycopg://portfolio:portfolio@localhost:5432/portfolio"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080,http://127.0.0.1:8080"
    environment: str = "development"
    contact_rate_limit: int = 5
    contact_window_seconds: int = 3600
    ip_hash_secret: str = "local-development-only-change-before-deployment"
    seed_file: Path = Path(__file__).resolve().parents[3] / "content" / "portfolio.json"
    serve_frontend: bool = False
    frontend_dist: Path = Path(__file__).resolve().parents[3] / "frontend" / "dist"
    ai_api_key: str = ""
    ai_model: str = "llama-3.1-8b-instant"
    ai_provider: str = "groq"
    assistant_mode: str = "auto"
    frontend_url: str = "http://127.0.0.1:5173"
    contact_receiver_email: str = ""
    email_provider: str = ""
    email_api_key: str = ""
    email_from_address: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_starttls: bool = True
    smtp_ssl: bool = False
    assistant_rate_limit: int = 30
    assistant_window_seconds: int = 3600
    assistant_session_limit: int = 30
    assistant_timeout_seconds: float = 15
    assistant_session_ttl_seconds: int = 1800
    assistant_max_sessions: int = 500

    @field_validator("ai_model", mode="before")
    @classmethod
    def default_model(cls, value):
        return value or "llama-3.1-8b-instant"

    @field_validator("database_url", mode="before")
    @classmethod
    def use_installed_postgres_driver(cls, value):
        if isinstance(value, str) and value.startswith("postgres://"):
            return "postgresql+psycopg://" + value[len("postgres://"):]
        if isinstance(value, str) and value.startswith("postgresql://"):
            return "postgresql+psycopg://" + value[len("postgresql://"):]
        return value

    @property
    def provider_api_key(self) -> str:
        return self.ai_api_key.strip()

    @property
    def provider_key_name(self) -> str:
        return "AI_API_KEY"

    @field_validator("cors_origins")
    @classmethod
    def restrict_origins(cls, value: str) -> str:
        if "*" in value:
            raise ValueError("Explicit CORS origins are required")
        return value

    @property
    def origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
