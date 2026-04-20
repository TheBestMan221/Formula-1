"""
ml_pipeline/data_ingestion.py
Stage 1 of DVC pipeline — generates F1 race data and logs metrics.
Kaggle dataset: https://www.kaggle.com/datasets/rohanrao/formula-1-world-championship-1950-2020
"""
import os, sys, json
from pathlib import Path
import numpy as np
import pandas as pd

ROOT = Path(__file__).parents[1]
DATA_DIR = ROOT / "backend" / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

PARAMS_FILE = ROOT / "params.yaml"
TRACKING_DIR = ROOT / "mlops" / "experiment_tracking"
TRACKING_DIR.mkdir(parents=True, exist_ok=True)

sys.path.insert(0, str(ROOT))


def load_params() -> dict:
    try:
        import yaml
        return yaml.safe_load(open(PARAMS_FILE))
    except Exception:
        return {}


def generate_synthetic_f1_data(n_races: int = 2200, seasons_from: int = 2010,
                                 seasons_to: int = 2024) -> pd.DataFrame:
    """Generate realistic synthetic F1 race data."""
    np.random.seed(42)
    drivers = [
        "Hamilton","Verstappen","Leclerc","Sainz","Norris",
        "Perez","Russell","Alonso","Vettel","Bottas",
        "Ricciardo","Gasly","Ocon","Stroll","Magnussen",
        "Tsunoda","Zhou","Sargeant","Albon","Hulkenberg"
    ]
    teams = [
        "Mercedes","Red Bull","Ferrari","Ferrari","McLaren",
        "Red Bull","Mercedes","Aston Martin","Aston Martin","Alfa Romeo",
        "AlphaTauri","AlphaTauri","Alpine","Alpine","Haas",
        "AlphaTauri","Alfa Romeo","Williams","Williams","Haas"
    ]
    tracks = [
        "Bahrain","Saudi Arabia","Australia","Azerbaijan","Miami",
        "Monaco","Spain","Canada","Austria","Britain",
        "Hungary","Belgium","Netherlands","Italy","Singapore",
        "Japan","Qatar","USA","Mexico","Brazil","Las Vegas","Abu Dhabi"
    ]
    driver_skill = {d: np.random.uniform(0.62, 1.0) for d in drivers}
    for d, s in [("Hamilton",0.97),("Verstappen",0.98),("Leclerc",0.93),
                  ("Norris",0.91),("Alonso",0.90),("Russell",0.88)]:
        driver_skill[d] = s

    team_perf = {
        "Mercedes":0.92,"Red Bull":0.96,"Ferrari":0.91,"McLaren":0.88,
        "Aston Martin":0.85,"Alpine":0.82,"AlphaTauri":0.79,
        "Alfa Romeo":0.78,"Haas":0.76,"Williams":0.75
    }
    rows = []
    n_seasons = seasons_to - seasons_from
    races_per_season = max(1, n_races // max(n_seasons, 1))

    for season in range(seasons_from, seasons_to + 1):
        for round_num in range(1, min(races_per_season, 23) + 1):
            track = tracks[(round_num - 1) % len(tracks)]
            race_id = (season - seasons_from) * 22 + round_num

            race_drivers = np.random.choice(drivers, size=20, replace=False)
            for pos_idx, driver in enumerate(race_drivers):
                team = teams[drivers.index(driver)]
                skill = driver_skill[driver]
                team_p = team_perf.get(team, 0.80)
                grid = pos_idx + 1
                quali_time = 80 + (grid * 0.3) + np.random.normal(0, 0.5)
                base_finish = grid + np.random.normal(0, 3) - (skill * 5) - (team_p * 3)
                finish_pos = int(np.clip(base_finish, 1, 20))
                weather = np.random.choice(["Dry","Wet","Mixed"], p=[0.70,0.15,0.15])
                pit_stops = np.random.choice([1,2,3], p=[0.25,0.55,0.20])
                tyre = np.random.choice(["Soft","Medium","Hard"])
                dnf = 1 if np.random.random() < (0.07 if weather=="Dry" else 0.14) else 0
                if dnf: finish_pos = np.random.randint(15, 21)
                pts_map = {1:25,2:18,3:15,4:12,5:10,6:8,7:6,8:4,9:2,10:1}
                points = 0 if dnf else pts_map.get(finish_pos, 0)
                rows.append({
                    "race_id":race_id,"season":season,"round":round_num,"track":track,
                    "driver":driver,"team":team,"grid_position":grid,
                    "qualifying_position":grid,"qualifying_time":round(quali_time,3),
                    "finish_position":finish_pos,"points":points,"pit_stops":pit_stops,
                    "tyre_compound":tyre,"weather":weather,"dnf":dnf,
                    "avg_lap_time":round(85 + finish_pos*0.1 + np.random.normal(0,0.3),3),
                    "driver_skill":round(skill,4),"team_performance":round(team_p,4),
                    "top10_finish":1 if finish_pos<=10 and not dnf else 0,
                    "podium":1 if finish_pos<=3 and not dnf else 0,
                    "pole_position":1 if grid==1 else 0,
                })
    df = pd.DataFrame(rows)
    print(f"[Ingestion] Generated {len(df):,} race records, {df['season'].nunique()} seasons")
    return df


def add_rolling_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.sort_values(["driver","season","round"]).reset_index(drop=True)
    for w in [3, 5]:
        df[f"driver_avg_pos_last{w}"] = (
            df.groupby("driver")["finish_position"]
            .transform(lambda x: x.shift(1).rolling(w, min_periods=1).mean()))
        df[f"driver_avg_pts_last{w}"] = (
            df.groupby("driver")["points"]
            .transform(lambda x: x.shift(1).rolling(w, min_periods=1).mean()))
    df["team_avg_pos_last5"] = (
        df.groupby("team")["finish_position"]
        .transform(lambda x: x.shift(1).rolling(5, min_periods=1).mean()))
    return df


def generate_lap_times(df: pd.DataFrame) -> pd.DataFrame:
    rows = []
    sample = df.sample(min(600, len(df)), random_state=42)
    for _, row in sample.iterrows():
        for lap in range(1, 58):
            rows.append({
                "race_id":row["race_id"],"driver":row["driver"],"lap":lap,
                "lap_time":round(row["avg_lap_time"]+np.random.normal(0,0.5),3),
                "position":row["finish_position"],"tyre":row["tyre_compound"]
            })
    return pd.DataFrame(rows)


def generate_pit_stops(df: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for _, row in df.iterrows():
        for stop in range(1, int(row["pit_stops"])+1):
            rows.append({
                "race_id":row["race_id"],"driver":row["driver"],"stop":stop,
                "lap":np.random.randint(10,50),"duration":round(np.random.uniform(2.3,4.5),3),
                "tyre_in":row["tyre_compound"],
                "tyre_out":np.random.choice(["Soft","Medium","Hard"])
            })
    return pd.DataFrame(rows)


def load_or_generate_data() -> pd.DataFrame:
    cache = DATA_DIR / "f1_races.csv"
    if cache.exists():
        df = pd.read_csv(cache)
        print(f"[Ingestion] Loaded cached: {len(df):,} rows")
        return df
    params = load_params()
    dp = params.get("data", {})
    df = generate_synthetic_f1_data(
        n_races=dp.get("n_races", 2200),
        seasons_from=dp.get("seasons_from", 2010),
        seasons_to=dp.get("seasons_to", 2024),
    )
    df.to_csv(cache, index=False)
    return df


if __name__ == "__main__":
    df = load_or_generate_data()
    df = add_rolling_features(df)
    df.to_csv(DATA_DIR / "f1_races_featured.csv", index=False)

    laps = generate_lap_times(df)
    laps.to_csv(DATA_DIR / "lap_times.csv", index=False)

    pits = generate_pit_stops(df)
    pits.to_csv(DATA_DIR / "pit_stops.csv", index=False)

    # Log metrics for DVC tracking
    metrics = {
        "rows": len(df), "seasons": int(df["season"].nunique()),
        "drivers": int(df["driver"].nunique()), "tracks": int(df["track"].nunique()),
        "lap_time_rows": len(laps), "pit_stop_rows": len(pits),
    }
    out = TRACKING_DIR / "ingestion_metrics.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(metrics, indent=2))

    print(f"[Ingestion] Complete — {len(df):,} races | {len(laps):,} laps | {len(pits):,} pit stops")
    print(f"[Ingestion] Metrics → {out}")
