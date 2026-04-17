from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = Field(default="Polymarket Copy Trader", alias="APP_NAME")
    app_env: str = Field(default="development", alias="APP_ENV")
    app_host: str = Field(default="0.0.0.0", alias="APP_HOST")
    app_port: int = Field(default=8000, alias="APP_PORT")
    database_url: str = Field(default="sqlite:///./data/app.db", alias="DATABASE_URL")
    polymarket_gamma_url: str = Field(
        default="https://gamma-api.polymarket.com", alias="POLYMARKET_GAMMA_URL"
    )
    polymarket_data_url: str = Field(
        default="https://data-api.polymarket.com", alias="POLYMARKET_DATA_URL"
    )
    coingecko_api_url: str = Field(
        default="https://api.coingecko.com/api/v3", alias="COINGECKO_API_URL"
    )
    allowed_origins: str = Field(default="http://localhost:5173", alias="ALLOWED_ORIGINS")
    session_secret: str = Field(default="change-me", alias="SESSION_SECRET")
    # "PAPER" (default) = simulated copy trades, no real funds needed.
    # "LIVE"            = real on-chain execution; requires balance & MetaMask signing.
    trading_mode: str = Field(default="PAPER", alias="TRADING_MODE")
    enable_simulated_execution: bool = Field(
        default=True, alias="ENABLE_SIMULATED_EXECUTION"
    )
    monitor_interval_seconds: int = Field(default=5, alias="MONITOR_INTERVAL_SECONDS")
    low_balance_threshold: float = Field(default=25, alias="LOW_BALANCE_THRESHOLD")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    return Settings()

