"""
ml_pipeline/train.py
Trains ALL ML models with params.yaml support + experiment tracking.
Units 2, 3, 4 syllabus alignment.
"""
import os, sys, json
from pathlib import Path
import numpy as np
import pandas as pd
import joblib

ROOT = Path(__file__).parents[1]
sys.path.insert(0, str(ROOT))

from sklearn.linear_model import LogisticRegression, LinearRegression, Ridge, Lasso
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.naive_bayes import GaussianNB
from sklearn.cluster import KMeans
from sklearn.metrics import (accuracy_score, precision_score, recall_score,
    f1_score, confusion_matrix, mean_absolute_error, mean_squared_error, r2_score)

MODELS_DIR = ROOT / "backend" / "models"
DATA_DIR   = ROOT / "backend" / "data"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

TRACKING_DIR = ROOT / "mlops" / "experiment_tracking" / "runs"
TRACKING_DIR.mkdir(parents=True, exist_ok=True)


def load_params() -> dict:
    pf = ROOT / "params.yaml"
    try:
        import yaml
        return yaml.safe_load(open(pf))
    except Exception:
        return {}


def track_run(name: str, model_type: str, params: dict, metrics: dict):
    import datetime, uuid
    run = {
        "run_id": str(uuid.uuid4())[:8],
        "model": name, "type": model_type,
        "timestamp": datetime.datetime.utcnow().isoformat()+"Z",
        "params": params, "metrics": metrics,
    }
    fn = TRACKING_DIR / f"{model_type}_{name.lower().replace(' ','_')}.json"
    fn.write_text(json.dumps(run, indent=2))


# ── UNIT 2: CLASSIFICATION ────────────────────────────────────────────────────
def train_classification_models(X_train, X_test, y_train, y_test, params: dict) -> dict:
    cp = params.get("classification", {}).get("models", {})

    lr_p  = cp.get("logistic_regression", {})
    dt_p  = cp.get("decision_tree", {})
    rf_p  = cp.get("random_forest", {})
    svm_p = cp.get("svm", {})
    nb_p  = cp.get("naive_bayes", {})

    models = {
        "Logistic Regression": (
            LogisticRegression(max_iter=lr_p.get("max_iter",1000),
                               C=lr_p.get("C",1.0), random_state=42),
            lr_p
        ),
        "Decision Tree": (
            DecisionTreeClassifier(max_depth=dt_p.get("max_depth",8),
                                   min_samples_split=dt_p.get("min_samples_split",20),
                                   min_samples_leaf=dt_p.get("min_samples_leaf",10),
                                   random_state=42),
            dt_p
        ),
        "Random Forest": (
            RandomForestClassifier(n_estimators=rf_p.get("n_estimators",200),
                                   max_depth=rf_p.get("max_depth",12),
                                   min_samples_split=rf_p.get("min_samples_split",10),
                                   random_state=42, n_jobs=-1),
            rf_p
        ),
        "SVM": (
            SVC(kernel=svm_p.get("kernel","rbf"), C=svm_p.get("C",1.0),
                probability=True, random_state=42),
            svm_p
        ),
        "Naive Bayes": (GaussianNB(), nb_p),
    }

    results = {}
    for name, (model, hparams) in models.items():
        print(f"  [Train] {name}...", end=" ", flush=True)
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        metrics = {
            "accuracy":   round(accuracy_score(y_test, y_pred), 4),
            "precision":  round(precision_score(y_test, y_pred, zero_division=0), 4),
            "recall":     round(recall_score(y_test, y_pred, zero_division=0), 4),
            "f1_score":   round(f1_score(y_test, y_pred, zero_division=0), 4),
            "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
        }
        try:
            from sklearn.metrics import roc_auc_score
            proba = model.predict_proba(X_test)[:,1]
            metrics["roc_auc"] = round(roc_auc_score(y_test, proba), 4)
        except Exception:
            pass
        results[name] = metrics
        print(f"Acc={metrics['accuracy']} F1={metrics['f1_score']}")
        key = name.lower().replace(" ","_")
        joblib.dump(model, MODELS_DIR / f"cls_{key}.pkl")
        track_run(name, "classification", hparams, metrics)

    return results


# ── UNIT 3: REGRESSION ────────────────────────────────────────────────────────
def train_regression_models(X_train, X_test, y_train, y_test, params: dict) -> dict:
    rp = params.get("regression", {}).get("models", {})

    models = {
        "Linear Regression": (LinearRegression(), {}),
        "Ridge Regression":  (Ridge(alpha=rp.get("ridge",{}).get("alpha",1.0)), rp.get("ridge",{})),
        "Lasso Regression":  (Lasso(alpha=rp.get("lasso",{}).get("alpha",0.1),
                                    max_iter=rp.get("lasso",{}).get("max_iter",2000)), rp.get("lasso",{})),
    }
    results = {}
    for name, (model, hparams) in models.items():
        print(f"  [Train] {name}...", end=" ", flush=True)
        model.fit(X_train, y_train)
        y_pred = np.clip(model.predict(X_test), 1, 20)
        metrics = {
            "mae":      round(mean_absolute_error(y_test, y_pred), 4),
            "mse":      round(mean_squared_error(y_test, y_pred), 4),
            "rmse":     round(np.sqrt(mean_squared_error(y_test, y_pred)), 4),
            "r2_score": round(r2_score(y_test, y_pred), 4),
        }
        results[name] = metrics
        print(f"MAE={metrics['mae']} R²={metrics['r2_score']}")
        key = name.lower().replace(" ","_")
        joblib.dump(model, MODELS_DIR / f"reg_{key}.pkl")
        track_run(name, "regression", hparams, metrics)

    return results


# ── UNIT 4: K-MEANS ───────────────────────────────────────────────────────────
def train_kmeans(df: pd.DataFrame, params: dict) -> dict:
    cp = params.get("clustering", {})
    k  = cp.get("n_clusters", 4)

    feats = ["driver_skill","team_performance","finish_position","points","pit_stops"]
    avail = [f for f in feats if f in df.columns]
    agg   = df.groupby("driver")[avail].mean().reset_index()
    X_cl  = agg[avail].fillna(0).values

    km = KMeans(n_clusters=k, init=cp.get("init","k-means++"),
                n_init=cp.get("n_init",20), max_iter=cp.get("max_iter",300),
                random_state=cp.get("random_state",42))
    km.fit(X_cl)
    agg["cluster"] = km.labels_

    labels_map = {
        0:"Top Performers", 1:"Midfield Racers",
        2:"Backmarkers",    3:"Inconsistent"
    }
    order = agg.groupby("cluster")["finish_position"].mean().sort_values().index.tolist()
    label = {order[i]: list(labels_map.values())[i] for i in range(len(order))}
    agg["cluster_label"] = agg["cluster"].map(label)

    joblib.dump(km, MODELS_DIR / "kmeans_drivers.pkl")
    agg.to_csv(DATA_DIR / "driver_clusters.csv", index=False)
    result = {"inertia": round(km.inertia_, 2), "n_clusters": k,
              "driver_clusters": agg.to_dict(orient="records")}
    print(f"  [KMeans] k={k} inertia={km.inertia_:.2f}")
    track_run("KMeans", "clustering", cp, {"inertia": km.inertia_, "n_clusters": k})
    return result


# ── POLE PREDICTION ───────────────────────────────────────────────────────────
def train_pole_model(X_train, X_test, y_train, y_test, params: dict) -> dict:
    rf_p = params.get("classification",{}).get("models",{}).get("random_forest",{})
    m = RandomForestClassifier(n_estimators=rf_p.get("n_estimators",200),
                               random_state=42, n_jobs=-1, class_weight="balanced")
    m.fit(X_train, y_train)
    y_pred = m.predict(X_test)
    metrics = {
        "accuracy": round(accuracy_score(y_test, y_pred), 4),
        "f1_score": round(f1_score(y_test, y_pred, zero_division=0), 4),
    }
    joblib.dump(m, MODELS_DIR / "pole_rf.pkl")
    print(f"  [Pole RF] Acc={metrics['accuracy']} F1={metrics['f1_score']}")
    return metrics


# ── MAIN ──────────────────────────────────────────────────────────────────────
def run_training():
    print("\n" + "="*60)
    print("  F1 ML TRAINING PIPELINE  (params.yaml driven)")
    print("="*60)

    params = load_params()
    sys.path.insert(0, str(ROOT / "ml_pipeline"))
    from preprocessing import preprocess_pipeline

    data = preprocess_pipeline(save=True)
    df   = data["df"]

    print("\n[Unit 2] Classification Models...")
    cls = train_classification_models(
        data["classification"]["X_train"], data["classification"]["X_test"],
        data["classification"]["y_train"], data["classification"]["y_test"], params)

    print("\n[Unit 3] Regression Models...")
    reg = train_regression_models(
        data["regression"]["X_train"], data["regression"]["X_test"],
        data["regression"]["y_train"], data["regression"]["y_test"], params)

    print("\n[Unit 2] Pole Prediction...")
    pole = train_pole_model(
        data["pole"]["X_train"], data["pole"]["X_test"],
        data["pole"]["y_train"], data["pole"]["y_test"], params)

    print("\n[Unit 4] K-Means Clustering...")
    cl = train_kmeans(df, params)

    all_results = {
        "classification": cls,
        "regression": reg,
        "pole": pole,
        "clustering": {"inertia": cl["inertia"], "n_clusters": cl["n_clusters"]},
    }
    (MODELS_DIR / "training_results.json").write_text(json.dumps(all_results, indent=2))

    best_cls = max(cls, key=lambda m: cls[m].get("f1_score",0))
    best_reg = max(reg, key=lambda m: reg[m].get("r2_score",0))

    print("\n" + "="*60)
    print("  TRAINING COMPLETE")
    print("="*60)
    print(f"  Best Classifier : {best_cls} (F1={cls[best_cls]['f1_score']})")
    print(f"  Best Regressor  : {best_reg} (R²={reg[best_reg]['r2_score']})")
    print(f"  Runs logged     : {len(list(TRACKING_DIR.glob('*.json')))} experiment runs")
    print("="*60 + "\n")
    return all_results


if __name__ == "__main__":
    run_training()
