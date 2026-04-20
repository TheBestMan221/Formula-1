"""
mlops/experiment_tracking/tracker.py

Lightweight experiment tracker (MLflow-style, no server required).
Logs: run_id, params, metrics, artifacts, tags, duration.
Stores runs in experiment_tracking/runs/ as JSON files.
"""
import os
import sys
import json
import uuid
import time
import datetime
from pathlib import Path
from typing import Any, Optional
from contextlib import contextmanager

TRACKING_DIR = Path(__file__).parent / "runs"
TRACKING_DIR.mkdir(parents=True, exist_ok=True)


class ExperimentTracker:
    """
    Tracks ML experiments locally with full reproducibility metadata.

    Usage:
        tracker = ExperimentTracker("f1_classification")
        with tracker.start_run(tags={"model": "random_forest"}) as run:
            run.log_param("n_estimators", 200)
            run.log_metric("accuracy", 0.87)
            run.log_artifact("backend/models/cls_random_forest.pkl")
    """

    def __init__(self, experiment_name: str):
        self.experiment_name = experiment_name
        self.exp_dir = TRACKING_DIR / experiment_name
        self.exp_dir.mkdir(parents=True, exist_ok=True)

    @contextmanager
    def start_run(self, run_name: str = None, tags: dict = None):
        run = Run(
            experiment_name=self.experiment_name,
            run_name=run_name or f"run_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}",
            tags=tags or {},
            exp_dir=self.exp_dir,
        )
        try:
            run._start()
            yield run
            run._end(status="FINISHED")
        except Exception as e:
            run._end(status="FAILED", error=str(e))
            raise

    def get_best_run(self, metric: str, ascending: bool = False) -> Optional[dict]:
        """Find run with best metric value."""
        runs = self.list_runs()
        if not runs:
            return None
        valid = [r for r in runs if metric in r.get("metrics", {})]
        if not valid:
            return None
        return sorted(valid, key=lambda r: r["metrics"][metric], reverse=not ascending)[0]

    def list_runs(self) -> list:
        runs = []
        for f in sorted(self.exp_dir.glob("*.json")):
            try:
                with open(f) as fp:
                    runs.append(json.load(fp))
            except Exception:
                pass
        return runs

    def compare_runs(self, metric: str) -> list:
        """Return runs sorted by metric for comparison."""
        runs = self.list_runs()
        valid = [r for r in runs if metric in r.get("metrics", {})]
        return sorted(valid, key=lambda r: r["metrics"][metric], reverse=True)


class Run:
    def __init__(self, experiment_name: str, run_name: str, tags: dict, exp_dir: Path):
        self.run_id = str(uuid.uuid4())[:8]
        self.experiment_name = experiment_name
        self.run_name = run_name
        self.tags = tags
        self.exp_dir = exp_dir
        self.params: dict = {}
        self.metrics: dict = {}
        self.artifacts: list = []
        self.start_time: float = 0
        self.data: dict = {}

    def _start(self):
        self.start_time = time.time()
        self._save(status="RUNNING")
        print(f"  [Tracker] Run started: {self.run_name} (id={self.run_id})")

    def _end(self, status: str, error: str = None):
        duration = round(time.time() - self.start_time, 2)
        self._save(status=status, duration=duration, error=error)
        print(f"  [Tracker] Run {status} in {duration}s → {self.run_name}")

    def _save(self, status: str = "RUNNING", duration: float = None, error: str = None):
        run_data = {
            "run_id": self.run_id,
            "run_name": self.run_name,
            "experiment": self.experiment_name,
            "status": status,
            "start_time": datetime.datetime.utcfromtimestamp(self.start_time).isoformat() + "Z" if self.start_time else None,
            "duration_seconds": duration,
            "error": error,
            "tags": self.tags,
            "params": self.params,
            "metrics": self.metrics,
            "artifacts": self.artifacts,
            "data": self.data,
        }
        out = self.exp_dir / f"{self.run_name}_{self.run_id}.json"
        with open(out, "w") as f:
            json.dump(run_data, f, indent=2)

    def log_param(self, key: str, value: Any):
        self.params[key] = value

    def log_params(self, params: dict):
        self.params.update(params)

    def log_metric(self, key: str, value: float):
        self.metrics[key] = round(float(value), 6)

    def log_metrics(self, metrics: dict):
        for k, v in metrics.items():
            self.log_metric(k, v)

    def log_artifact(self, path: str, description: str = ""):
        self.artifacts.append({"path": path, "description": description})

    def log_data(self, key: str, value: Any):
        self.data[key] = value

    def set_tag(self, key: str, value: str):
        self.tags[key] = value


# ── Convenience functions ────────────────────────────────────────────────────

def log_ingestion_metrics(df_shape: tuple, file_paths: list):
    """Log data ingestion metrics to DVC-tracked file."""
    out = Path(__file__).parent / "ingestion_metrics.json"
    metrics = {
        "rows": df_shape[0],
        "columns": df_shape[1],
        "files_created": len(file_paths),
        "file_paths": file_paths,
    }
    with open(out, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"  [Tracker] Ingestion metrics saved → {out.name}")
    return metrics


def log_feature_metrics(df_before_shape: tuple, df_after_shape: tuple, new_features: list):
    """Log feature engineering metrics."""
    out = Path(__file__).parent / "feature_metrics.json"
    metrics = {
        "input_rows": df_before_shape[0],
        "input_cols": df_before_shape[1],
        "output_cols": df_after_shape[1],
        "features_added": df_after_shape[1] - df_before_shape[1],
        "new_feature_names": new_features,
    }
    with open(out, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"  [Tracker] Feature metrics saved → {out.name}")
    return metrics


def log_training_run(model_name: str, model_type: str, params: dict, metrics: dict) -> str:
    """Log a single model training run."""
    tracker = ExperimentTracker(f"f1_{model_type}")
    with tracker.start_run(run_name=model_name.lower().replace(" ", "_"), tags={"model_type": model_type}) as run:
        run.log_params(params)
        run.log_metrics(metrics)
        run.log_artifact(f"backend/models/{model_type}_{model_name.lower().replace(' ', '_')}.pkl")
        return run.run_id


if __name__ == "__main__":
    # Demo: show experiment tracking
    tracker = ExperimentTracker("f1_demo")
    with tracker.start_run("random_forest_v1", tags={"unit": "2", "syllabus": "classification"}) as run:
        run.log_params({"n_estimators": 200, "max_depth": 12})
        run.log_metrics({"accuracy": 0.8721, "f1_score": 0.8489, "roc_auc": 0.91})
        run.log_artifact("backend/models/cls_random_forest.pkl", "Trained RF classifier")

    print("\nRuns logged:")
    for r in tracker.list_runs():
        print(f"  {r['run_name']}: acc={r['metrics'].get('accuracy')} f1={r['metrics'].get('f1_score')}")
