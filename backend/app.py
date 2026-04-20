"""
backend/app.py
Production-grade FastAPI backend — F1 ML Prediction System.
"""
import os, sys, json, time
import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field

BACKEND_DIR = Path(__file__).parent
PROJECT_DIR = BACKEND_DIR.parent
sys.path.insert(0, str(PROJECT_DIR))
sys.path.insert(0, str(BACKEND_DIR))

from backend.ml.simulation import run_monte_carlo_simulation
from backend.ml.strategy    import recommend_strategy
from backend.genai_module   import (
    generate_race_summary, generate_driver_insight,
    generate_strategy_insight, generate_model_insight,
    get_active_provider, get_usage_stats, stream_race_summary
)
from backend.utils.logger import get_logger, log_prediction, log_simulation

logger = get_logger("f1_api")

# ── App setup ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title="F1 ML Prediction API",
    description="Formula 1 Race Prediction & Strategy Recommendation System — ML + GenAI",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request timing middleware ─────────────────────────────────────────────────
@app.middleware("http")
async def add_timing_header(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = round((time.time() - start) * 1000, 1)
    response.headers["X-Process-Time-Ms"] = str(duration)
    return response

# ── Global model cache ────────────────────────────────────────────────────────
MODELS_DIR = BACKEND_DIR / "models"
DATA_DIR   = BACKEND_DIR / "data"
_models: Dict[str, Any] = {}
_encoders = None
_scaler   = None
_feature_cols = None
_df: Optional[pd.DataFrame] = None


def load_models():
    global _models, _encoders, _scaler, _feature_cols, _df
    model_files = {
        "cls_random_forest":       "cls_random_forest.pkl",
        "cls_logistic_regression": "cls_logistic_regression.pkl",
        "cls_decision_tree":       "cls_decision_tree.pkl",
        "cls_svm":                 "cls_svm.pkl",
        "cls_naive_bayes":         "cls_naive_bayes.pkl",
        "reg_linear_regression":   "reg_linear_regression.pkl",
        "reg_ridge_regression":    "reg_ridge_regression.pkl",
        "reg_lasso_regression":    "reg_lasso_regression.pkl",
        "pole_rf":                 "pole_rf.pkl",
        "kmeans":                  "kmeans_drivers.pkl",
    }
    for key, fname in model_files.items():
        p = MODELS_DIR / fname
        if p.exists():
            _models[key] = joblib.load(p)

    for fname, var in [("encoders.pkl","_encoders"),("scaler.pkl","_scaler"),
                        ("feature_cols.pkl","_feature_cols")]:
        p = MODELS_DIR / fname
        if p.exists():
            globals()[var] = joblib.load(p)

    for fname in ["f1_processed.csv","f1_races_featured.csv","f1_races.csv"]:
        p = DATA_DIR / fname
        if p.exists():
            _df = pd.read_csv(p)
            break

    logger.info(f"Models loaded: {len(_models)} | data: {len(_df) if _df is not None else 0} rows")


def ensure_models():
    if not _models:
        load_models()
    if not _models:
        logger.warning("No models found — running training pipeline...")
        from ml_pipeline.data_ingestion import load_or_generate_data, add_rolling_features, generate_lap_times, generate_pit_stops
        from ml_pipeline.feature_engineering import run_feature_engineering
        from ml_pipeline.train import run_training
        df = load_or_generate_data()
        df = add_rolling_features(df)
        df.to_csv(DATA_DIR / "f1_races_featured.csv", index=False)
        generate_lap_times(df).to_csv(DATA_DIR / "lap_times.csv", index=False)
        generate_pit_stops(df).to_csv(DATA_DIR / "pit_stops.csv", index=False)
        run_feature_engineering()
        run_training()
        load_models()


# ── Pydantic models ───────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    driver: str             = Field(..., example="Verstappen")
    team: str               = Field(..., example="Red Bull")
    track: str              = Field(..., example="Bahrain")
    grid_position: int      = Field(..., ge=1, le=20, example=1)
    qualifying_position: int = Field(..., ge=1, le=20, example=1)
    qualifying_time: float  = Field(83.5, example=82.5)
    weather: str            = Field("Dry", example="Dry")
    tyre_compound: str      = Field("Medium", example="Soft")
    pit_stops: int          = Field(2, ge=1, le=4, example=2)

class SimulateRequest(BaseModel):
    track: str              = Field(..., example="Monaco")
    weather: str            = Field("Dry", example="Dry")
    n_simulations: int      = Field(1000, ge=50, le=5000, example=1000)
    drivers: Optional[List[str]] = None

class StrategyRequest(BaseModel):
    track: str              = Field(..., example="Bahrain")
    total_laps: int         = Field(57, ge=20, le=100, example=57)
    weather: str            = Field("Dry", example="Dry")
    driver_position: int    = Field(5, ge=1, le=20, example=5)

class InsightRequest(BaseModel):
    data: Dict[str, Any]
    insight_type: str       = Field("race", example="race")  # race|driver|strategy|model


# ── Feature builder ───────────────────────────────────────────────────────────
def build_feature_vector(req: PredictRequest) -> pd.DataFrame:
    ensure_models()
    feature_map = {
        "grid_position": req.grid_position,
        "qualifying_position": req.qualifying_position,
        "qualifying_time": req.qualifying_time,
        "pit_stops": req.pit_stops,
        "driver_skill": 0.85,
        "team_performance": 0.85,
        "driver_avg_pos_last3": float(req.grid_position),
        "driver_avg_pos_last5": float(req.grid_position),
        "driver_avg_pts_last3": 10.0,
        "driver_avg_pts_last5": 10.0,
        "team_avg_pos_last5": float(req.grid_position),
    }
    if _encoders:
        for col, val in [("driver", req.driver), ("team", req.team),
                         ("track", req.track), ("weather", req.weather),
                         ("tyre_compound", req.tyre_compound)]:
            le = _encoders.get(col)
            enc_col = f"{col}_enc"
            if le:
                try:
                    feature_map[enc_col] = int(le.transform([val])[0])
                except Exception:
                    feature_map[enc_col] = int(le.transform([le.classes_[0]])[0])
            else:
                feature_map[enc_col] = 0
    else:
        for col in ["driver","team","track","weather","tyre_compound"]:
            feature_map[f"{col}_enc"] = abs(hash(getattr(req, col, ""))) % 20

    cols = _feature_cols if _feature_cols else list(feature_map.keys())
    row = {c: feature_map.get(c, 0.0) for c in cols}
    df_row = pd.DataFrame([row])[cols]

    if _scaler and _feature_cols:
        try:
            scaled = _scaler.transform(df_row)
            df_row = pd.DataFrame(scaled, columns=cols)
        except Exception as e:
            logger.warning(f"Scaler failed: {e}")
    return df_row


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/", tags=["System"])
async def root():
    return {
        "name": "F1 ML Prediction API",
        "version": "2.0.0",
        "docs": "/docs",
        "genai_provider": get_active_provider(),
    }


@app.get("/health", tags=["System"])
async def health():
    ensure_models()
    registry_path = PROJECT_DIR / "mlops" / "model_registry" / "registry.json"
    registry = {}
    if registry_path.exists():
        registry = json.loads(registry_path.read_text())
    return {
        "status": "healthy",
        "models_loaded": len(_models),
        "data_loaded": _df is not None,
        "records": int(len(_df)) if _df is not None else 0,
        "genai_provider": get_active_provider(),
        "model_registry_version": registry.get("version"),
        "registry_stage": registry.get("stage"),
    }


@app.get("/genai/status", tags=["GenAI"])
async def genai_status():
    """GenAI provider status and usage statistics."""
    return {
        "provider": get_active_provider(),
        "usage": get_usage_stats(),
        "capabilities": [
            "race_summary", "driver_insight",
            "strategy_insight", "model_insight", "streaming"
        ],
    }


@app.post("/predict", tags=["Prediction"])
async def predict_race(req: PredictRequest):
    """Predict race outcome using all trained classification + regression models."""
    t0 = time.time()
    ensure_models()
    vec = build_feature_vector(req)
    result = {
        "driver": req.driver, "team": req.team,
        "track": req.track, "grid_position": req.grid_position,
        "weather": req.weather, "tyre_compound": req.tyre_compound,
        "predictions": {},
    }

    # Classification
    for key, name in [
        ("cls_random_forest",       "Random Forest"),
        ("cls_logistic_regression", "Logistic Regression"),
        ("cls_decision_tree",       "Decision Tree"),
        ("cls_svm",                 "SVM"),
        ("cls_naive_bayes",         "Naive Bayes"),
    ]:
        if key not in _models:
            continue
        try:
            pred  = int(_models[key].predict(vec)[0])
            proba = float(_models[key].predict_proba(vec)[0][1]) \
                    if hasattr(_models[key], "predict_proba") else None
            result["predictions"][name] = {
                "top10_prediction": bool(pred),
                "top10_probability": round(proba * 100, 1) if proba is not None else None,
                "type": "classification",
            }
        except Exception as e:
            logger.error(f"Model {name} predict error: {e}")

    # Regression
    for key, name in [
        ("reg_ridge_regression",  "Ridge Regression"),
        ("reg_linear_regression", "Linear Regression"),
        ("reg_lasso_regression",  "Lasso Regression"),
    ]:
        if key not in _models:
            continue
        try:
            pos = float(np.clip(_models[key].predict(vec)[0], 1, 20))
            result["predictions"][name] = {
                "predicted_position": round(pos, 1),
                "type": "regression",
            }
        except Exception as e:
            logger.error(f"Model {name} predict error: {e}")

    # Pole position
    if "pole_rf" in _models:
        try:
            pole_p = float(_models["pole_rf"].predict_proba(vec)[0][1])
            result["pole_probability"] = round(pole_p * 100, 1)
        except Exception:
            result["pole_probability"] = None

    # Ensemble consensus
    top10_votes = [v["top10_prediction"]
                   for v in result["predictions"].values()
                   if "top10_prediction" in v]
    if top10_votes:
        result["ensemble_top10"] = sum(top10_votes) > len(top10_votes) / 2

    reg_preds = [v["predicted_position"]
                 for v in result["predictions"].values()
                 if "predicted_position" in v]
    if reg_preds:
        result["ensemble_position"] = round(float(np.mean(reg_preds)), 1)

    # GenAI insight
    rf = result["predictions"].get("Random Forest", {})
    result["ai_insight"] = generate_race_summary({
        "track": req.track, "weather": req.weather,
        "predicted_winner": req.driver, "team": req.team,
        "win_probability": rf.get("top10_probability", 50),
        "top10_probability": rf.get("top10_probability", 50),
        "podium_probability": rf.get("top10_probability", 30),
        "strategy": f"{req.pit_stops}-stop",
        "grid_position": req.grid_position,
    })

    duration_ms = (time.time() - t0) * 1000
    log_prediction(logger, req.driver, req.track, "ensemble",
                   {"ensemble_top10": result.get("ensemble_top10")}, duration_ms)
    result["processing_time_ms"] = round(duration_ms, 1)
    return result


@app.post("/predict/stream", tags=["Prediction"])
async def predict_race_stream(req: PredictRequest):
    """Stream AI insight as it generates (Server-Sent Events)."""
    ensure_models()
    data = {
        "track": req.track, "weather": req.weather,
        "predicted_winner": req.driver, "team": req.team,
        "win_probability": 50.0, "strategy": f"{req.pit_stops}-stop",
    }
    async def event_stream():
        async for chunk in stream_race_summary(data):
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.post("/simulate", tags=["Simulation"])
async def simulate_race(req: SimulateRequest):
    """Monte Carlo race simulation — runs up to 1000 race outcomes."""
    t0 = time.time()
    ensure_models()

    ALL_DRIVERS = [
        "Verstappen","Hamilton","Leclerc","Norris","Sainz",
        "Perez","Russell","Alonso","Bottas","Ricciardo",
        "Gasly","Ocon","Stroll","Magnussen","Tsunoda",
        "Zhou","Sargeant","Albon","Hulkenberg","Bearman"
    ]
    SKILLS = [0.98,0.97,0.93,0.91,0.89,0.87,0.88,0.90,0.82,0.83,
              0.81,0.80,0.79,0.78,0.77,0.76,0.72,0.74,0.75,0.73]
    TEAM_PERFS = [0.96,0.92,0.91,0.88,0.91,0.96,0.92,0.85,0.78,0.80,
                  0.79,0.82,0.85,0.76,0.79,0.78,0.75,0.75,0.76,0.76]

    drivers = req.drivers if req.drivers else ALL_DRIVERS
    n = len(drivers)

    sim_result = run_monte_carlo_simulation(
        drivers=drivers,
        team_performances=TEAM_PERFS[:n],
        driver_skills=SKILLS[:n],
        grid_positions=list(range(1, n + 1)),
        weather=req.weather,
        track=req.track,
        n_simulations=req.n_simulations,
    )

    sim_result["ai_insight"] = generate_race_summary({
        "track": req.track, "weather": req.weather,
        "predicted_winner": sim_result["metadata"]["winner"],
        "win_probability": sim_result["metadata"]["winner_win_prob"],
        "strategy": "race strategy TBD",
    })

    duration_ms = (time.time() - t0) * 1000
    log_simulation(logger, req.track, req.n_simulations,
                   sim_result["metadata"]["winner"], duration_ms)
    sim_result["processing_time_ms"] = round(duration_ms, 1)
    return sim_result


@app.post("/strategy", tags=["Strategy"])
async def get_strategy(req: StrategyRequest):
    """Race strategy recommendation with AI tactical commentary."""
    strategy = recommend_strategy(
        track=req.track, total_laps=req.total_laps,
        weather=req.weather, driver_position=req.driver_position,
    )
    if strategy.get("recommended_strategy"):
        strategy["ai_insight"] = generate_strategy_insight(
            strategy["recommended_strategy"])
    return strategy


@app.get("/drivers", tags=["Analytics"])
async def get_drivers():
    """Driver performance analytics with AI insights."""
    ensure_models()
    if _df is None:
        raise HTTPException(503, "Data not loaded")

    agg = _df.groupby("driver").agg(
        races=("race_id", "count"),
        podiums=("podium", "sum"),
        top10=("top10_finish", "sum"),
        avg_finish=("finish_position", "mean"),
        total_points=("points", "sum"),
        avg_points=("points", "mean"),
        team=("team", "last"),
        dnf_count=("dnf", "sum"),
    ).reset_index()

    agg["win_rate"] = (agg["podiums"] / agg["races"] * 100).round(1)
    agg["top10_rate"] = (agg["top10"] / agg["races"] * 100).round(1)
    agg = agg.sort_values("total_points", ascending=False).reset_index(drop=True)

    result = []
    for _, row in agg.iterrows():
        d = row.to_dict()
        for k, v in d.items():
            if hasattr(v, "item"):
                d[k] = v.item()
        d["avg_finish"] = round(d["avg_finish"], 2)
        d["avg_points"] = round(d["avg_points"], 2)
        d["ai_insight"] = generate_driver_insight(row["driver"], {
            "avg_finish": row["avg_finish"], "wins": int(row.get("podiums", 0)),
            "podiums": int(row["podiums"]), "races": int(row["races"]),
            "total_points": float(row["total_points"]), "team": row["team"],
            "top10": int(row["top10"]),
        })
        result.append(d)

    return {"drivers": result[:20], "total": len(result)}


@app.get("/teams", tags=["Analytics"])
async def get_teams():
    """Constructor performance analytics."""
    ensure_models()
    if _df is None:
        raise HTTPException(503, "Data not loaded")

    agg = _df.groupby("team").agg(
        races=("race_id", "count"),
        podiums=("podium", "sum"),
        top10=("top10_finish", "sum"),
        avg_finish=("finish_position", "mean"),
        total_points=("points", "sum"),
        avg_points=("points", "mean"),
        dnf_rate=("dnf", "mean"),
    ).reset_index().sort_values("total_points", ascending=False)

    result = []
    for _, row in agg.iterrows():
        d = row.to_dict()
        for k, v in d.items():
            if hasattr(v, "item"):
                d[k] = v.item()
        d["avg_finish"] = round(d["avg_finish"], 2)
        d["dnf_rate"] = round(d["dnf_rate"], 4)
        result.append(d)

    return {"teams": result}


@app.get("/models/performance", tags=["MLOps"])
async def get_model_performance():
    """All ML model evaluation metrics."""
    merged = {}
    for fname in ["training_results.json", "evaluation_report.json"]:
        p = MODELS_DIR / fname
        if p.exists():
            merged.update(json.loads(p.read_text()))

    if not merged:
        raise HTTPException(503, "Run training pipeline first: make pipeline")

    # Add AI interpretation for each model
    for model_name, metrics in merged.get("classification", {}).items():
        metrics["ai_insight"] = generate_model_insight(model_name, metrics, "classification")
    for model_name, metrics in merged.get("regression", {}).items():
        metrics["ai_insight"] = generate_model_insight(model_name, metrics, "regression")

    return merged


@app.get("/registry", tags=["MLOps"])
async def get_model_registry():
    """Model registry — versions, champion, quality gates."""
    p = PROJECT_DIR / "mlops" / "model_registry" / "registry.json"
    if not p.exists():
        raise HTTPException(503, "Registry not found. Run: python mlops/model_registry/register_models.py")
    return json.loads(p.read_text())


@app.get("/experiments", tags=["MLOps"])
async def get_experiments():
    """Experiment tracking runs."""
    runs_dir = PROJECT_DIR / "mlops" / "experiment_tracking" / "runs"
    runs = []
    if runs_dir.exists():
        for f in sorted(runs_dir.glob("*.json"), reverse=True)[:50]:
            try:
                runs.append(json.loads(f.read_text()))
            except Exception:
                pass
    return {"runs": runs, "total": len(runs)}


@app.get("/clusters", tags=["Analytics"])
async def get_driver_clusters():
    """K-Means driver clustering results."""
    p = DATA_DIR / "driver_clusters.csv"
    if p.exists():
        df = pd.read_csv(p)
        return {"clusters": df.to_dict(orient="records"), "n_clusters": int(df["cluster"].nunique())}
    raise HTTPException(503, "Clusters not available — run: make train")


@app.get("/tracks", tags=["Data"])
async def get_tracks():
    """F1 track data."""
    return {"tracks": [
        {"name":"Bahrain","laps":57,"length_km":5.412,"country":"Bahrain","type":"High-speed"},
        {"name":"Saudi Arabia","laps":50,"length_km":6.174,"country":"Saudi Arabia","type":"Street"},
        {"name":"Australia","laps":58,"length_km":5.278,"country":"Australia","type":"Park"},
        {"name":"Azerbaijan","laps":51,"length_km":6.003,"country":"Azerbaijan","type":"Street"},
        {"name":"Miami","laps":57,"length_km":5.412,"country":"USA","type":"Street"},
        {"name":"Monaco","laps":78,"length_km":3.337,"country":"Monaco","type":"Street"},
        {"name":"Spain","laps":66,"length_km":4.675,"country":"Spain","type":"Technical"},
        {"name":"Canada","laps":70,"length_km":4.361,"country":"Canada","type":"Semi-street"},
        {"name":"Austria","laps":71,"length_km":4.318,"country":"Austria","type":"High-speed"},
        {"name":"Britain","laps":52,"length_km":5.891,"country":"UK","type":"High-speed"},
        {"name":"Hungary","laps":70,"length_km":4.381,"country":"Hungary","type":"Technical"},
        {"name":"Belgium","laps":44,"length_km":7.004,"country":"Belgium","type":"Mixed"},
        {"name":"Netherlands","laps":72,"length_km":4.259,"country":"Netherlands","type":"Technical"},
        {"name":"Italy","laps":53,"length_km":5.793,"country":"Italy","type":"High-speed"},
        {"name":"Singapore","laps":62,"length_km":4.940,"country":"Singapore","type":"Street"},
        {"name":"Japan","laps":53,"length_km":5.807,"country":"Japan","type":"Technical"},
        {"name":"Qatar","laps":57,"length_km":5.380,"country":"Qatar","type":"High-speed"},
        {"name":"USA","laps":56,"length_km":5.513,"country":"USA","type":"Mixed"},
        {"name":"Mexico","laps":71,"length_km":4.304,"country":"Mexico","type":"Technical"},
        {"name":"Brazil","laps":71,"length_km":4.309,"country":"Brazil","type":"Mixed"},
        {"name":"Las Vegas","laps":50,"length_km":6.120,"country":"USA","type":"Street"},
        {"name":"Abu Dhabi","laps":58,"length_km":5.281,"country":"UAE","type":"Modern"},
    ]}


# ── Startup ───────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    logger.info("F1 ML Prediction API v2.0 starting...")
    try:
        load_models()
    except Exception as e:
        logger.warning(f"Model load warning: {e}")
    logger.info(f"API ready | models={len(_models)} | genai={get_active_provider()}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True, log_level="info")
