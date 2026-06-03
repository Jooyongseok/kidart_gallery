"""Centralized configuration via environment variables."""
import os
from pathlib import Path

# Load .env file if present
_env_path = Path(__file__).parent / ".env"
if _env_path.exists():
    for line in _env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))


class Settings:
    SECRET_KEY: str = os.environ.get("SECRET_KEY", "kidart-dev-secret-change-in-prod")
    DATABASE_URL: str = os.environ.get("DATABASE_URL", "sqlite:///./kidart_gallery.db")
    ANTHROPIC_API_KEY: str = os.environ.get("ANTHROPIC_API_KEY", "")
    CORS_ORIGINS: str = os.environ.get(
        "CORS_ORIGINS",
        "http://localhost:8080,http://localhost:8180,http://localhost:3000,http://localhost:8200",
    )
    UPLOAD_DIR: str = os.environ.get("UPLOAD_DIR", "uploads")
    UPLOAD_MAX_SIZE_MB: int = int(os.environ.get("UPLOAD_MAX_SIZE_MB", "10"))
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    VLM_URL: str = os.environ.get("VLM_URL", "http://localhost:8100/v1/chat/completions")
    GEMINI_API_KEY: str = os.environ.get("GEMINI_API_KEY", "")
    REPLICATE_API_TOKEN: str = os.environ.get("REPLICATE_API_TOKEN", "")
    OPENAI_API_KEY: str = os.environ.get("OPENAI_API_KEY", "")
    FAL_KEY: str = os.environ.get("FAL_KEY", "")
    IDEOGRAM_API_KEY: str = os.environ.get("IDEOGRAM_API_KEY", "")
    CHARACTER_UPLOAD_DIR: str = os.environ.get("CHARACTER_UPLOAD_DIR", "uploads/characters")
    EXPERIMENT_DIR: str = os.environ.get("EXPERIMENT_DIR", "uploads/experiments")
    IMAGE_GENERATION_PROVIDER: str = os.environ.get("IMAGE_GENERATION_PROVIDER", "flux2_fal")


settings = Settings()
