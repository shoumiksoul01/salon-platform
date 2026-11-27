from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Read from backend/.env (git-ignored) or from real environment variables.
    # Run the server from the backend folder so ".env" is found.
    # Every field has a default so the app imports (CI, tests) without a .env file.
    database_url: str = ""

    # Supabase project (used to check login tokens and to store files).
    supabase_url: str = ""  # https://<ref>.supabase.co
    supabase_service_role_key: str = ""  # secret, backend only, never in the frontend
    # Only for projects that still sign tokens with the old shared secret (HS256).
    # Newer projects use public keys and do not need it.
    supabase_jwt_secret: str = ""

    # Frontend origins allowed by CORS, separated by commas.
    frontend_origin: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
