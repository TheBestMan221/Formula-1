"""
ml_pipeline/feature_engineering.py
Advanced feature engineering for F1 prediction — Unit 1 alignment.
"""
import os
import pandas as pd
import numpy as np

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "backend", "data")


def compute_elo_ratings(df: pd.DataFrame) -> pd.DataFrame:
    """Compute Elo-like rating per driver across seasons."""
    ratings = {}
    elo_col = []

    for _, row in df.sort_values(["season", "round"]).iterrows():
        driver = row["driver"]
        if driver not in ratings:
            ratings[driver] = 1500.0
        elo_col.append(ratings[driver])

        # Update: top3 finish boosts rating
        if row.get("podium", 0) == 1:
            ratings[driver] += 20
        elif row.get("top10_finish", 0) == 1:
            ratings[driver] += 8
        else:
            ratings[driver] -= 5
        ratings[driver] = max(800, min(2500, ratings[driver]))

    df["driver_elo"] = elo_col
    return df


def compute_track_affinity(df: pd.DataFrame) -> pd.DataFrame:
    """How well does each driver perform at each track?"""
    aff = df.groupby(["driver", "track"])["finish_position"].mean().reset_index()
    aff.columns = ["driver", "track", "track_affinity_avg"]
    df = df.merge(aff, on=["driver", "track"], how="left")
    df["track_affinity_avg"] = df["track_affinity_avg"].fillna(10.0)
    return df


def compute_head_to_head(df: pd.DataFrame) -> pd.DataFrame:
    """Win rate of driver vs field at each race."""
    race_wins = df.groupby(["race_id", "driver"])["finish_position"].min()
    df["career_wins"] = (
        df.groupby("driver")["podium"]
        .transform(lambda x: x.shift(1).cumsum().fillna(0))
    )
    df["career_races"] = (
        df.groupby("driver")["race_id"]
        .transform(lambda x: x.expanding().count() - 1)
    )
    df["win_rate"] = (df["career_wins"] / (df["career_races"] + 1)).fillna(0)
    return df


def compute_team_reliability(df: pd.DataFrame) -> pd.DataFrame:
    """DNF rate per team as a reliability proxy."""
    reliability = df.groupby("team")["dnf"].mean().reset_index()
    reliability.columns = ["team", "team_dnf_rate"]
    df = df.merge(reliability, on="team", how="left")
    return df


def compute_grid_vs_result(df: pd.DataFrame) -> pd.DataFrame:
    """Delta between grid and finish — overtaking ability."""
    df["grid_to_finish_delta"] = df["grid_position"] - df["finish_position"]
    return df


def compute_wet_performance(df: pd.DataFrame) -> pd.DataFrame:
    """How does each driver perform in wet conditions?"""
    wet = df[df["weather"].isin(["Wet", "Mixed"])].groupby("driver")["finish_position"].mean().reset_index()
    wet.columns = ["driver", "wet_avg_finish"]
    df = df.merge(wet, on="driver", how="left")
    df["wet_avg_finish"] = df["wet_avg_finish"].fillna(df["finish_position"].mean())
    return df


def run_feature_engineering() -> pd.DataFrame:
    path = os.path.join(DATA_DIR, "f1_races_featured.csv")
    if not os.path.exists(path):
        path = os.path.join(DATA_DIR, "f1_races.csv")

    df = pd.read_csv(path)
    print(f"[FeatureEng] Input: {df.shape}")

    df = compute_elo_ratings(df)
    df = compute_track_affinity(df)
    df = compute_head_to_head(df)
    df = compute_team_reliability(df)
    df = compute_grid_vs_result(df)
    df = compute_wet_performance(df)

    out_path = os.path.join(DATA_DIR, "f1_races_featured.csv")
    df.to_csv(out_path, index=False)
    print(f"[FeatureEng] Output: {df.shape} -> {out_path}")
    return df


if __name__ == "__main__":
    df = run_feature_engineering()
    print("\nNew features added:")
    new_cols = ["driver_elo", "track_affinity_avg", "win_rate", "team_dnf_rate",
                "grid_to_finish_delta", "wet_avg_finish"]
    print(df[new_cols].describe())
