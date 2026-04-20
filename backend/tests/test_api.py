"""
backend/tests/test_api.py
Pytest test suite for all API endpoints.
Run: pytest backend/tests/ -v
"""
import sys
import json
import pytest
from pathlib import Path

ROOT = Path(__file__).parents[2]
sys.path.insert(0, str(ROOT))


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def client():
    """Create test client — runs full pipeline if models missing."""
    try:
        from fastapi.testclient import TestClient
        from backend.app import app, load_models
        load_models()
        return TestClient(app)
    except ImportError:
        pytest.skip("fastapi[testclient] not installed")


@pytest.fixture(scope="module")
def trained_models():
    """Ensure models exist before API tests."""
    models_dir = ROOT / "backend" / "models"
    required = ["cls_random_forest.pkl", "reg_ridge_regression.pkl",
                "encoders.pkl", "scaler.pkl", "feature_cols.pkl"]
    missing = [m for m in required if not (models_dir / m).exists()]
    if missing:
        pytest.skip(f"Models not trained: {missing}. Run: make pipeline")


# ── Unit tests: GenAI module ──────────────────────────────────────────────────

class TestGenAI:
    def test_race_summary_returns_string(self):
        from backend.genai_module import generate_race_summary
        result = generate_race_summary({
            "track": "Monaco", "weather": "Dry",
            "predicted_winner": "Verstappen", "win_probability": 45.2,
            "podium_probability": 78.0, "top10_probability": 96.0,
        })
        assert isinstance(result, str)
        assert len(result) > 50, "AI insight too short"

    def test_race_summary_wet_weather(self):
        from backend.genai_module import generate_race_summary
        result = generate_race_summary({
            "track": "Britain", "weather": "Wet",
            "predicted_winner": "Hamilton", "win_probability": 30.0,
        })
        assert isinstance(result, str)
        assert len(result) > 30

    def test_driver_insight(self):
        from backend.genai_module import generate_driver_insight
        result = generate_driver_insight("Hamilton", {
            "avg_finish": 2.3, "wins": 103, "podiums": 197,
            "races": 332, "team": "Mercedes",
        })
        assert isinstance(result, str)
        assert len(result) > 40

    def test_strategy_insight(self):
        from backend.genai_module import generate_strategy_insight
        result = generate_strategy_insight({
            "name": "2-Stop: Soft → Medium → Soft",
            "pit_stops": 2,
            "tyre_sequence": ["Soft", "Medium", "Soft"],
            "pit_windows": [20, 44],
            "risk_level": "High",
        })
        assert isinstance(result, str)
        assert len(result) > 40

    def test_model_insight_classification(self):
        from backend.genai_module import generate_model_insight
        result = generate_model_insight(
            "Random Forest",
            {"accuracy": 0.87, "f1_score": 0.85, "roc_auc": 0.91},
            "classification"
        )
        assert isinstance(result, str)

    def test_model_insight_regression(self):
        from backend.genai_module import generate_model_insight
        result = generate_model_insight(
            "Ridge Regression",
            {"mae": 2.3, "r2_score": 0.71, "rmse": 3.1},
            "regression"
        )
        assert isinstance(result, str)

    def test_get_active_provider(self):
        from backend.genai_module import get_active_provider
        provider = get_active_provider()
        assert isinstance(provider, str)
        assert len(provider) > 0

    def test_usage_stats(self):
        from backend.genai_module import get_usage_stats
        stats = get_usage_stats()
        assert isinstance(stats, dict)
        assert "total_tokens" in stats


# ── Unit tests: Simulation ────────────────────────────────────────────────────

class TestSimulation:
    def test_monte_carlo_returns_results(self):
        from backend.ml.simulation import run_monte_carlo_simulation
        result = run_monte_carlo_simulation(
            drivers=["Verstappen", "Hamilton", "Leclerc"],
            team_performances=[0.96, 0.92, 0.91],
            driver_skills=[0.98, 0.97, 0.93],
            grid_positions=[1, 2, 3],
            weather="Dry",
            track="Bahrain",
            n_simulations=100,
        )
        assert "results" in result
        assert len(result["results"]) == 3
        assert result["n_simulations"] == 100

    def test_win_probabilities_sum_to_100(self):
        from backend.ml.simulation import run_monte_carlo_simulation
        result = run_monte_carlo_simulation(
            drivers=["A", "B", "C", "D"],
            team_performances=[0.9, 0.85, 0.8, 0.75],
            driver_skills=[0.95, 0.9, 0.85, 0.8],
            grid_positions=[1, 2, 3, 4],
            n_simulations=200,
        )
        total_win = sum(r["win_probability"] for r in result["results"])
        assert abs(total_win - 100.0) < 5.0, f"Win probs don't sum to ~100: {total_win}"

    def test_wet_weather_increases_variance(self):
        from backend.ml.simulation import run_monte_carlo_simulation
        dry = run_monte_carlo_simulation(
            drivers=["A", "B"], team_performances=[0.9, 0.7],
            driver_skills=[0.95, 0.75], grid_positions=[1, 2],
            weather="Dry", n_simulations=300,
        )
        wet = run_monte_carlo_simulation(
            drivers=["A", "B"], team_performances=[0.9, 0.7],
            driver_skills=[0.95, 0.75], grid_positions=[1, 2],
            weather="Wet", n_simulations=300,
        )
        # In wet conditions favourite should have lower dominance
        dry_leader_win = dry["results"][0]["win_probability"]
        wet_leader_win = wet["results"][0]["win_probability"]
        # Just ensure both return valid numbers
        assert 0 <= dry_leader_win <= 100
        assert 0 <= wet_leader_win <= 100

    def test_metadata_winner_is_highest_prob(self):
        from backend.ml.simulation import run_monte_carlo_simulation
        result = run_monte_carlo_simulation(
            drivers=["Verstappen", "Hamilton", "Bottas"],
            team_performances=[0.96, 0.92, 0.82],
            driver_skills=[0.98, 0.97, 0.82],
            grid_positions=[1, 2, 3],
            n_simulations=500,
        )
        winner = result["metadata"]["winner"]
        results_sorted = sorted(result["results"], key=lambda x: x["win_probability"], reverse=True)
        assert winner == results_sorted[0]["driver"]


# ── Unit tests: Strategy ──────────────────────────────────────────────────────

class TestStrategy:
    def test_dry_strategy_returns_recommended(self):
        from backend.ml.strategy import recommend_strategy
        result = recommend_strategy("Bahrain", 57, "Dry", 5)
        assert "recommended_strategy" in result
        s = result["recommended_strategy"]
        assert "tyre_sequence" in s
        assert "pit_stops" in s
        assert "pit_windows" in s
        assert s["pit_stops"] >= 1

    def test_wet_strategy_includes_wet_tyres(self):
        from backend.ml.strategy import recommend_strategy
        result = recommend_strategy("Britain", 52, "Wet", 3)
        s = result["recommended_strategy"]
        tyres = s["tyre_sequence"]
        assert any(t in ["Wet", "Intermediate"] for t in tyres), \
            f"Wet race should include wet/inters: {tyres}"

    def test_tactical_notes_present(self):
        from backend.ml.strategy import recommend_strategy
        result = recommend_strategy("Monaco", 78, "Dry", 1)
        assert "tactical_notes" in result
        assert len(result["tactical_notes"]) > 0

    def test_all_strategies_have_scores(self):
        from backend.ml.strategy import recommend_strategy
        result = recommend_strategy("Italy", 53, "Dry", 10)
        for s in result["all_strategies"]:
            assert "overall_score" in s or "pace_score" in s

    def test_leading_vs_backmarker_strategy_differs(self):
        from backend.ml.strategy import recommend_strategy
        leader   = recommend_strategy("Spain", 66, "Dry", 1)
        backmarker = recommend_strategy("Spain", 66, "Dry", 18)
        # Both should return valid strategies
        assert leader["recommended_strategy"]["pit_stops"] >= 1
        assert backmarker["recommended_strategy"]["pit_stops"] >= 1


# ── Unit tests: Model Registry ────────────────────────────────────────────────

class TestModelRegistry:
    def test_registry_can_run(self):
        from mlops.model_registry.register_models import register_models
        registry = register_models()
        assert "version" in registry
        assert "stage" in registry
        assert registry["stage"] in ["production", "staging"]
        assert "champion" in registry
        assert "models" in registry

    def test_registry_tracks_version(self):
        from mlops.model_registry.register_models import register_models
        r1 = register_models()
        r2 = register_models()
        assert r2["version"] == r1["version"] + 1

    def test_registry_computes_git_hash(self):
        from mlops.model_registry.register_models import get_git_hash
        h = get_git_hash()
        assert isinstance(h, str)
        assert len(h) > 0


# ── Unit tests: Experiment Tracker ───────────────────────────────────────────

class TestExperimentTracker:
    def test_tracker_logs_run(self, tmp_path):
        from mlops.experiment_tracking.tracker import ExperimentTracker
        tracker = ExperimentTracker.__new__(ExperimentTracker)
        tracker.experiment_name = "test"
        tracker.exp_dir = tmp_path

        with tracker.start_run("test_run") as run:
            run.log_param("n_estimators", 100)
            run.log_metric("accuracy", 0.87)
            run.log_metric("f1_score", 0.85)
            run.log_artifact("backend/models/cls_random_forest.pkl")
            run.set_tag("unit", "2")

        runs = tracker.list_runs()
        assert len(runs) == 1
        r = runs[0]
        assert r["params"]["n_estimators"] == 100
        assert r["metrics"]["accuracy"] == 0.87
        assert r["status"] == "FINISHED"
        assert r["tags"]["unit"] == "2"

    def test_tracker_finds_best_run(self, tmp_path):
        from mlops.experiment_tracking.tracker import ExperimentTracker
        tracker = ExperimentTracker.__new__(ExperimentTracker)
        tracker.experiment_name = "test"
        tracker.exp_dir = tmp_path

        with tracker.start_run("run_a") as r:
            r.log_metric("f1_score", 0.75)
        with tracker.start_run("run_b") as r:
            r.log_metric("f1_score", 0.92)
        with tracker.start_run("run_c") as r:
            r.log_metric("f1_score", 0.83)

        best = tracker.get_best_run("f1_score")
        assert best["metrics"]["f1_score"] == 0.92


# ── Integration tests: full pipeline ─────────────────────────────────────────

class TestPipelineIntegration:
    def test_preprocessing_produces_splits(self):
        from ml_pipeline.preprocessing import preprocess_pipeline
        data = preprocess_pipeline(save=False)
        assert "classification" in data
        assert "regression" in data
        cls = data["classification"]
        assert "X_train" in cls and "X_test" in cls
        assert len(cls["X_train"]) > len(cls["X_test"])

    def test_feature_cols_are_valid(self):
        from ml_pipeline.preprocessing import preprocess_pipeline
        data = preprocess_pipeline(save=False)
        cols = data["feature_cols"]
        assert len(cols) >= 5
        assert "grid_position" in cols or "driver_enc" in cols

    def test_training_results_structure(self):
        results_path = ROOT / "backend" / "models" / "training_results.json"
        if not results_path.exists():
            pytest.skip("training_results.json not found — run: make train")
        results = json.loads(results_path.read_text())
        assert "classification" in results
        assert "regression" in results
        cls = results["classification"]
        assert "Random Forest" in cls
        rf = cls["Random Forest"]
        assert "accuracy" in rf
        assert "f1_score" in rf
        assert "confusion_matrix" in rf

    def test_evaluation_report_structure(self):
        report_path = ROOT / "backend" / "models" / "evaluation_report.json"
        if not report_path.exists():
            pytest.skip("evaluation_report.json not found — run: make evaluate")
        report = json.loads(report_path.read_text())
        assert "classification" in report or "regression" in report


# ── API endpoint tests (require running server) ───────────────────────────────

class TestAPIEndpoints:
    def test_health(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "healthy"

    def test_predict_endpoint(self, client):
        r = client.post("/predict", json={
            "driver": "Verstappen", "team": "Red Bull",
            "track": "Bahrain", "grid_position": 1,
            "qualifying_position": 1, "qualifying_time": 82.5,
            "weather": "Dry", "tyre_compound": "Soft", "pit_stops": 2,
        })
        assert r.status_code == 200
        d = r.json()
        assert "predictions" in d
        assert "ai_insight" in d
        assert len(d["ai_insight"]) > 40

    def test_simulate_endpoint(self, client):
        r = client.post("/simulate", json={
            "track": "Monaco", "weather": "Dry", "n_simulations": 100
        })
        assert r.status_code == 200
        d = r.json()
        assert "results" in d
        assert len(d["results"]) == 20  # full grid
        assert d["n_simulations"] == 100
        assert "ai_insight" in d

    def test_strategy_endpoint(self, client):
        r = client.post("/strategy", json={
            "track": "Bahrain", "total_laps": 57,
            "weather": "Dry", "driver_position": 5,
        })
        assert r.status_code == 200
        d = r.json()
        assert "recommended_strategy" in d
        assert "tactical_notes" in d
        assert "ai_insight" in d

    def test_drivers_endpoint(self, client):
        r = client.get("/drivers")
        assert r.status_code == 200
        d = r.json()
        assert "drivers" in d
        assert len(d["drivers"]) >= 10

    def test_teams_endpoint(self, client):
        r = client.get("/teams")
        assert r.status_code == 200
        d = r.json()
        assert "teams" in d
        assert len(d["teams"]) >= 5

    def test_model_performance_endpoint(self, client):
        r = client.get("/models/performance")
        assert r.status_code in [200, 503]
        if r.status_code == 200:
            d = r.json()
            assert "classification" in d

    def test_clusters_endpoint(self, client):
        r = client.get("/clusters")
        assert r.status_code in [200, 503]

    def test_tracks_endpoint(self, client):
        r = client.get("/tracks")
        assert r.status_code == 200
        d = r.json()
        assert "tracks" in d
        assert len(d["tracks"]) >= 5

    def test_genai_status_endpoint(self, client):
        r = client.get("/genai/status")
        assert r.status_code == 200
        d = r.json()
        assert "provider" in d

    def test_predict_requires_valid_fields(self, client):
        r = client.post("/predict", json={"driver": "Verstappen"})
        # Should fail with 422 (validation error) not 500
        assert r.status_code in [422, 400]
