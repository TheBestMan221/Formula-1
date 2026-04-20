"""
ml_pipeline/evaluate.py
Loads saved models and generates comprehensive evaluation report.
"""
import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, roc_auc_score, mean_absolute_error,
    mean_squared_error, r2_score, classification_report
)

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "backend", "models")
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "backend", "data")


def load_processed_data():
    path = os.path.join(DATA_DIR, "f1_processed.csv")
    if not os.path.exists(path):
        path = os.path.join(DATA_DIR, "f1_races.csv")
    return pd.read_csv(path)


def evaluate_all_models() -> dict:
    feature_cols = joblib.load(os.path.join(MODELS_DIR, "feature_cols.pkl"))
    scaler = joblib.load(os.path.join(MODELS_DIR, "scaler.pkl"))

    df = load_processed_data()
    feature_cols_present = [c for c in feature_cols if c in df.columns]
    X_raw = df[feature_cols_present].fillna(0)
    X_scaled_arr = scaler.transform(X_raw)
    # Keep as DataFrame to preserve feature names → avoids sklearn UserWarning
    X_scaled = pd.DataFrame(X_scaled_arr, columns=feature_cols_present)

    from sklearn.model_selection import train_test_split
    y_cls = df["top10_finish"]
    y_reg = df["finish_position"]

    _, X_test, _, y_cls_test = train_test_split(X_scaled, y_cls, test_size=0.2, random_state=42, stratify=y_cls)
    _, X_test_reg, _, y_reg_test = train_test_split(X_scaled, y_reg, test_size=0.2, random_state=42)

    report = {"classification": {}, "regression": {}}

    # --- Classification ---
    cls_models = {
        "Logistic Regression": "cls_logistic_regression.pkl",
        "Decision Tree": "cls_decision_tree.pkl",
        "Random Forest": "cls_random_forest.pkl",
        "SVM": "cls_svm.pkl",
        "Naive Bayes": "cls_naive_bayes.pkl",
    }

    for name, fname in cls_models.items():
        fpath = os.path.join(MODELS_DIR, fname)
        if not os.path.exists(fpath):
            continue
        model = joblib.load(fpath)
        y_pred = model.predict(X_test)
        try:
            y_proba = model.predict_proba(X_test)[:, 1]
            auc = round(roc_auc_score(y_cls_test, y_proba), 4)
        except:
            auc = None

        report["classification"][name] = {
            "accuracy": round(accuracy_score(y_cls_test, y_pred), 4),
            "precision": round(precision_score(y_cls_test, y_pred, zero_division=0), 4),
            "recall": round(recall_score(y_cls_test, y_pred, zero_division=0), 4),
            "f1_score": round(f1_score(y_cls_test, y_pred, zero_division=0), 4),
            "roc_auc": auc,
            "confusion_matrix": confusion_matrix(y_cls_test, y_pred).tolist(),
        }

    # --- Regression ---
    reg_models = {
        "Linear Regression": "reg_linear_regression.pkl",
        "Ridge Regression": "reg_ridge_regression.pkl",
        "Lasso Regression": "reg_lasso_regression.pkl",
    }

    for name, fname in reg_models.items():
        fpath = os.path.join(MODELS_DIR, fname)
        if not os.path.exists(fpath):
            continue
        model = joblib.load(fpath)
        y_pred = np.clip(model.predict(X_test_reg), 1, 20)

        report["regression"][name] = {
            "mae": round(mean_absolute_error(y_reg_test, y_pred), 4),
            "mse": round(mean_squared_error(y_reg_test, y_pred), 4),
            "rmse": round(np.sqrt(mean_squared_error(y_reg_test, y_pred)), 4),
            "r2_score": round(r2_score(y_reg_test, y_pred), 4),
        }

    # Save report
    out_path = os.path.join(MODELS_DIR, "evaluation_report.json")
    with open(out_path, "w") as f:
        json.dump(report, f, indent=2)

    print("[Evaluate] Report saved to", out_path)
    return report


if __name__ == "__main__":
    report = evaluate_all_models()
    print("\n=== CLASSIFICATION RESULTS ===")
    for name, metrics in report["classification"].items():
        print(f"{name}: Acc={metrics['accuracy']} F1={metrics['f1_score']} AUC={metrics.get('roc_auc')}")
    print("\n=== REGRESSION RESULTS ===")
    for name, metrics in report["regression"].items():
        print(f"{name}: MAE={metrics['mae']} R²={metrics['r2_score']}")
