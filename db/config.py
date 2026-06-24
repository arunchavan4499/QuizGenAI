from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    db_type: str = "postgres"  # 'sqlite' or 'postgres'
    db_path: str = "./quiz.db"  # For SQLite
    db_username: str = "postgres"
    db_password: str = "postgres"
    db_hostname: str = "localhost"
    db_port: int = 5432
    db_name: str = "hire4thon"

    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_time: int = 60

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parents[1] / ".env"),
        extra="ignore",
    )


settings = Settings()

# Build database URL based on configuration
if settings.db_type == "sqlite":
    db_url = f"sqlite:///{settings.db_path}"
else:
    db_url = (
        f"postgresql+psycopg://{settings.db_username}:{settings.db_password}"
        f"@{settings.db_hostname}:{settings.db_port}/{settings.db_name}"
    )
