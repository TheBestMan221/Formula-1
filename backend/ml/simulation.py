"""
backend/ml/simulation.py
Monte Carlo Race Simulation — runs 500–1000 simulations.
"""
import numpy as np
import pandas as pd
from typing import List, Dict, Any


def run_monte_carlo_simulation(
    drivers: List[str],
    team_performances: List[float],
    driver_skills: List[float],
    grid_positions: List[int],
    weather: str = "Dry",
    track: str = "Generic",
    n_simulations: int = 1000,
) -> Dict[str, Any]:
    """
    Run Monte Carlo simulation for race outcome prediction.

    Args:
        drivers: List of driver names
        team_performances: List of team performance scores (0-1)
        driver_skills: List of driver skill scores (0-1)
        grid_positions: List of starting grid positions
        weather: Race weather condition
        n_simulations: Number of simulations to run

    Returns:
        Dictionary with win_probability, podium_probability, top10_probability per driver
    """
    np.random.seed(None)  # Fresh seed each run
    n_drivers = len(drivers)

    win_counts = np.zeros(n_drivers)
    podium_counts = np.zeros(n_drivers)
    top10_counts = np.zeros(n_drivers)
    position_sums = np.zeros(n_drivers)

    weather_noise = {"Dry": 1.0, "Wet": 2.5, "Mixed": 1.8}.get(weather, 1.0)

    for sim in range(n_simulations):
        # Base score: lower is better (like finishing position)
        scores = []
        for i in range(n_drivers):
            grid = grid_positions[i] if i < len(grid_positions) else (i + 1)
            skill = driver_skills[i] if i < len(driver_skills) else 0.80
            team = team_performances[i] if i < len(team_performances) else 0.80

            # Performance score with randomness
            base = (grid * 0.3) - (skill * 8) - (team * 6)
            noise = np.random.normal(0, weather_noise * 1.5)
            dnf_chance = 0.05 if weather == "Dry" else 0.12
            dnf = np.random.random() < dnf_chance

            score = base + noise + (50 if dnf else 0)
            scores.append(score)

        # Rank by score (lower = better finish)
        ranked = np.argsort(scores)
        for pos, driver_idx in enumerate(ranked):
            finish_pos = pos + 1
            position_sums[driver_idx] += finish_pos
            if finish_pos == 1:
                win_counts[driver_idx] += 1
            if finish_pos <= 3:
                podium_counts[driver_idx] += 1
            if finish_pos <= 10:
                top10_counts[driver_idx] += 1

    results = []
    for i, driver in enumerate(drivers):
        results.append({
            "driver": driver,
            "win_probability": round(win_counts[i] / n_simulations * 100, 2),
            "podium_probability": round(podium_counts[i] / n_simulations * 100, 2),
            "top10_probability": round(top10_counts[i] / n_simulations * 100, 2),
            "avg_predicted_position": round(position_sums[i] / n_simulations, 2),
        })

    results.sort(key=lambda x: x["avg_predicted_position"])
    return {
        "n_simulations": n_simulations,
        "weather": weather,
        "track": track,
        "results": results,
        "metadata": {
            "winner": results[0]["driver"],
            "winner_win_prob": results[0]["win_probability"],
        }
    }


def strategy_simulation(
    pit_stop_laps: List[int],
    tyre_sequence: List[str],
    total_laps: int = 57,
    baseline_lap_time: float = 85.0
) -> Dict[str, Any]:
    """
    Simulate race strategy and calculate total time.
    """
    times = []
    current_lap = 0
    pit_loss_per_stop = 22.0  # seconds per pit stop

    tyre_degradation = {"Soft": 0.15, "Medium": 0.08, "Hard": 0.04}

    for i, pit_lap in enumerate(pit_stop_laps + [total_laps]):
        tyre = tyre_sequence[i] if i < len(tyre_sequence) else "Medium"
        deg = tyre_degradation.get(tyre, 0.08)
        stint_laps = pit_lap - current_lap

        stint_time = sum(
            baseline_lap_time + (lap_num * deg) + np.random.normal(0, 0.2)
            for lap_num in range(stint_laps)
        )
        times.append(stint_time)
        current_lap = pit_lap

    total_time = sum(times) + pit_loss_per_stop * len(pit_stop_laps)
    return {
        "total_time_seconds": round(total_time, 2),
        "total_time_formatted": _format_time(total_time),
        "pit_stops": len(pit_stop_laps),
        "pit_laps": pit_stop_laps,
        "tyre_sequence": tyre_sequence,
        "stint_times": [round(t, 2) for t in times],
    }


def _format_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    return f"{h}h {m:02d}m {s:05.2f}s"
