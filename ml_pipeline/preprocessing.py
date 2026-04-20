"""
ml_pipeline/preprocessing.py
Data cleaning, encoding, scaling — Unit 1 syllabus alignment.
"""
import os
import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder, StandardScaler, MinMaxScaler
from sklearn.model_selection import train_test_split
import joblib

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "backend", "data")
MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "backend", "models")
os.makedirs(MODELS_DIR, exist_ok=True)


def load_data() -> pd.DataFrame:
    path = os.path.join(DATA_DIR, "f1_races_featured.csv")
    if not os.path.exists(path):
        path = os.path.join(DATA_DIR, "f1_races.csv")
    df = pd.read_csv(path)
    print(f"[Preprocessing] Loaded {len(df)} rows, {df.shape[1]} columns")
    return df


def handle_missing_values(df: pd.DataFrame) -> pd.DataFrame:
    """Unit 1: Handle missing values via median/mode imputation."""
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        missing = df[col].isnull().sum()
        if missing > 0:
            df[col] = df[col].fillna(df[col].median())
            print(f"  [Impute] {col}: filled {missing} with median")

    cat_cols = df.select_dtypes(include=["object"]).columns
    for col in cat_cols:
        missing = df[col].isnull().sum()
        if missing > 0:
            df[col] = df[col].fillna(df[col].mode()[0])
            print(f"  [Impute] {col}: filled {missing} with mode")
    return df


def encode_categoricals(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """Unit 1: Encode categorical variables using LabelEncoder."""
    encoders = {}
    cat_cols = ["driver", "team", "track", "weather", "tyre_compound"]
    for col in cat_cols:
        if col in df.columns:
            le = LabelEncoder()
            df[f"{col}_enc"] = le.fit_transform(df[col].astype(str))
            encoders[col] = le
            print(f"  [Encode] {col} -> {col}_enc ({len(le.classes_)} classes)")
    return df, encoders


def scale_features(df: pd.DataFrame, feature_cols: list) -> tuple[pd.DataFrame, object]:
    """Unit 1: Feature scaling using StandardScaler."""
    scaler = StandardScaler()
    existing_cols = [c for c in feature_cols if c in df.columns]
    df_scaled = df.copy()
    df_scaled[existing_cols] = scaler.fit_transform(df[existing_cols])
    print(f"  [Scale] Scaled {len(existing_cols)} features")
    return df_scaled, scaler


def get_feature_columns(df: pd.DataFrame) -> list:
    """Unit 1: Feature selection — domain-driven + correlation-based."""
    base_features = [
        "grid_position", "qualifying_position", "qualifying_time",
        "driver_enc", "team_enc", "track_enc", "weather_enc", "tyre_compound_enc",
        "driver_skill", "team_performance", "pit_stops",
    ]
    rolling_features = [c for c in df.columns if "last" in c]
    return [f for f in base_features + rolling_features if f in df.columns]


def preprocess_pipeline(save: bool = True) -> dict:
    """Full preprocessing pipeline — returns train/test splits for all tasks."""
    df = load_data()
    df = handle_missing_values(df)
    df, encoders = encode_categoricals(df)

    # Add rolling features if not present
    if "driver_avg_pos_last5" not in df.columns:
        df = df.sort_values(["driver_enc", "season", "round"]).reset_index(drop=True)
        for window in [3, 5]:
            df[f"driver_avg_pos_last{window}"] = (
                df.groupby("driver_enc")["finish_position"]
                .transform(lambda x: x.shift(1).rolling(window, min_periods=1).mean())
            )
            df[f"driver_avg_pts_last{window}"] = (
                df.groupby("driver_enc")["points"]
                .transform(lambda x: x.shift(1).rolling(window, min_periods=1).mean())
            )
        df[f"team_avg_pos_last5"] = (
            df.groupby("team_enc")["finish_position"]
            .transform(lambda x: x.shift(1).rolling(5, min_periods=1).mean())
        )

    feature_cols = get_feature_columns(df)
    print(f"\n[Features] Using {len(feature_cols)} features: {feature_cols[:5]}...")

    df_scaled, scaler = scale_features(df, feature_cols)

    results = {}

    # --- Classification: Top 10 finish ---
    X_cls = df_scaled[feature_cols].fillna(0)
    y_cls = df["top10_finish"]
    X_tr, X_te, y_tr, y_te = train_test_split(X_cls, y_cls, test_size=0.2, random_state=42, stratify=y_cls)
    results["classification"] = {"X_train": X_tr, "X_test": X_te, "y_train": y_tr, "y_test": y_te}
    print(f"[Split] Classification: train={len(X_tr)}, test={len(X_te)}")

    # --- Regression: Finish position ---
    y_reg = df["finish_position"]
    X_tr2, X_te2, y_tr2, y_te2 = train_test_split(X_cls, y_reg, test_size=0.2, random_state=42)
    results["regression"] = {"X_train": X_tr2, "X_test": X_te2, "y_train": y_tr2, "y_test": y_te2}
    print(f"[Split] Regression: train={len(X_tr2)}, test={len(X_te2)}")

    # --- Pole prediction ---
    y_pole = df["pole_position"]
    X_tr3, X_te3, y_tr3, y_te3 = train_test_split(X_cls, y_pole, test_size=0.2, random_state=42, stratify=y_pole)
    results["pole"] = {"X_train": X_tr3, "X_test": X_te3, "y_train": y_tr3, "y_test": y_te3}

    results["feature_cols"] = feature_cols
    results["df"] = df
    results["encoders"] = encoders
    results["scaler"] = scaler

    if save:
        joblib.dump(encoders, os.path.join(MODELS_DIR, "encoders.pkl"))
        joblib.dump(scaler, os.path.join(MODELS_DIR, "scaler.pkl"))
        joblib.dump(feature_cols, os.path.join(MODELS_DIR, "feature_cols.pkl"))
        df_scaled.to_csv(os.path.join(DATA_DIR, "f1_processed.csv"), index=False)
        print("[Preprocessing] Saved encoders, scaler, feature_cols")

    return results


if __name__ == "__main__":
    results = preprocess_pipeline()
    print("\n[Preprocessing] Complete.")
