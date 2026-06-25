"""Application settings, loaded from the environment / .env file."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_DATABASE_URL = "sqlite:///./simplesave.db"


class Settings(BaseSettings):
    """Runtime configuration.

    Values are read from environment variables or a local ``.env`` file.
    When ``DATABASE_URL`` is unset, a local SQLite file is used so the app
    runs end-to-end without Supabase.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = DEFAULT_DATABASE_URL
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    jwt_secret: str = "change-me-in-production"
    payment_to_income_ratio: float = 0.38
    max_age_new_mortgage: int = 85
    max_age_refinance: int = 80


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()
