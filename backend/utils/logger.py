"""
backend/utils/logger.py
Structured JSON logging for production-grade observability.
"""
import logging
import json
import sys
import time
from pathlib import Path

LOG_DIR = Path(__file__).parents[2] / "backend" / "data" / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)


class JSONFormatter(logging.Formatter):
    """Format log records as JSON for structured logging."""
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        if hasattr(record, "extra"):
            log_data.update(record.extra)
        return json.dumps(log_data)


def get_logger(name: str) -> logging.Logger:
    """Get a configured logger with JSON + console handlers."""
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger

    logger.setLevel(logging.INFO)

    # Console handler (human-readable in dev)
    ch = logging.StreamHandler(sys.stdout)
    ch.setLevel(logging.INFO)
    ch.setFormatter(logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)-20s | %(message)s",
        datefmt="%H:%M:%S"
    ))
    logger.addHandler(ch)

    # File handler (JSON for prod)
    try:
        fh = logging.FileHandler(LOG_DIR / "f1_api.log")
        fh.setLevel(logging.INFO)
        fh.setFormatter(JSONFormatter())
        logger.addHandler(fh)
    except Exception:
        pass

    return logger


def log_prediction(logger: logging.Logger, driver: str, track: str,
                   model: str, result: dict, duration_ms: float):
    """Structured prediction log entry."""
    logger.info(
        f"Prediction | {driver} @ {track} | {model} | {duration_ms:.1f}ms",
        extra={
            "event": "prediction",
            "driver": driver, "track": track,
            "model": model, "duration_ms": duration_ms,
            "result": result,
        }
    )


def log_simulation(logger: logging.Logger, track: str, n_sims: int,
                   winner: str, duration_ms: float):
    """Structured simulation log entry."""
    logger.info(
        f"Simulation | {track} | {n_sims} sims | winner={winner} | {duration_ms:.1f}ms",
        extra={
            "event": "simulation",
            "track": track, "n_simulations": n_sims,
            "winner": winner, "duration_ms": duration_ms,
        }
    )
