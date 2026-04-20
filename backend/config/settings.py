"""
backend/config/settings.py
Centralised configuration management using environment variables.
"""
import os
from pathlib import Path
from dataclasses import dataclass, field

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

ROOT = Path(__file__).parents[2]


@dataclass
class Settings:
    # Server
    HOST: str              = os.getenv("HOST", "0.0.0.0")
    PORT: int              = int(os.getenv("PORT", "8000"))
    ENV: str               = os.getenv("ENV", "development")
    DEBUG: bool            = os.getenv("DEBUG", "false").lower() == "true"
    LOG_LEVEL: str         = os.getenv("LOG_LEVEL", "info")
    WORKERS: int           = int(os.getenv("WORKERS", "1"))

    # Paths
    MODELS_DIR: Path       = ROOT / "backend" / "models"
    DATA_DIR: Path         = ROOT / "backend" / "data"
    MLOPS_DIR: Path        = ROOT / "mlops"

    # GenAI
    OPENAI_API_KEY: str    = os.getenv("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    OPENAI_MODEL: str      = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    GENAI_MAX_TOKENS: int  = int(os.getenv("GENAI_MAX_TOKENS", "300"))
    GENAI_TEMPERATURE: float = float(os.getenv("GENAI_TEMPERATURE", "0.75"))

    # Simulation
    DEFAULT_N_SIMULATIONS: int = int(os.getenv("DEFAULT_N_SIMULATIONS", "1000"))
    MAX_N_SIMULATIONS: int     = int(os.getenv("MAX_N_SIMULATIONS", "5000"))

    # CORS
    CORS_ORIGINS: list     = field(default_factory=lambda: ["*"])

    @property
    def is_production(self) -> bool:
        return self.ENV == "production"

    @property
    def genai_provider(self) -> str:
        if self.OPENAI_API_KEY and len(self.OPENAI_API_KEY) > 10:
            return "openai"
        if self.ANTHROPIC_API_KEY and len(self.ANTHROPIC_API_KEY) > 10:
            return "anthropic"
        return "rule-based"

    def __post_init__(self):
        self.MODELS_DIR.mkdir(parents=True, exist_ok=True)
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)


settings = Settings()
