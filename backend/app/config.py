from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    tmdb_api_key: str = ""
    database_url: str = "sqlite:///./filmpersona.db"
    redis_url: str = "redis://localhost:6379/0"

    # Letterboxd scraping
    scrape_min_delay_seconds: float = 1.0  # be a polite scraper
    scrape_max_diary_pages: int = 40  # hard cap: 40 pages x 50 entries = 2000 films
    cache_ttl_seconds: int = 60 * 60 * 24  # 24h for scrape + TMDB responses


@lru_cache
def get_settings() -> Settings:
    return Settings()
