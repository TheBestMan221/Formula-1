"""
backend/ml/strategy.py
Race strategy recommendation: pit stops + tyre plan.
Combines rule-based logic with ML insights.
"""
import numpy as np
from typing import List, Dict, Any, Optional


TYRE_LIFE = {
    "Soft": 20,
    "Medium": 35,
    "Hard": 50,
}

TYRE_PACE = {
    "Soft": 0.0,
    "Medium": 0.4,
    "Hard": 0.8,
}

MANDATORY_COMPOUNDS = 2  # F1 rules: must use at least 2 compounds


def recommend_strategy(
    track: str,
    total_laps: int,
    weather: str,
    driver_position: int,
    pit_stop_data: Optional[Dict] = None,
) -> Dict[str, Any]:
    """
    Recommend optimal race strategy based on track, weather, and position.

    Strategy rules:
    - Wet weather: always start on inters/wets, early switch to dry
    - Long tracks: prefer Hard tyres, fewer stops
    - Short tracks: Soft-Medium 2-stop preferred
    - Leading drivers: undercut threat awareness
    """

    strategies = _generate_strategies(total_laps, weather, driver_position)
    ranked = _rank_strategies(strategies, driver_position, weather)

    primary = ranked[0]
    alternative = ranked[1] if len(ranked) > 1 else None

    return {
        "track": track,
        "total_laps": total_laps,
        "weather": weather,
        "recommended_strategy": primary,
        "alternative_strategy": alternative,
        "all_strategies": ranked[:3],
        "tactical_notes": _tactical_notes(driver_position, weather, track),
    }


def _generate_strategies(total_laps: int, weather: str, position: int) -> List[Dict]:
    strategies = []

    if weather in ["Wet", "Mixed"]:
        # Wet strategy
        strategies.append({
            "name": "Wet → Intermediate → Dry",
            "pit_stops": 2,
            "pit_windows": [int(total_laps * 0.15), int(total_laps * 0.40)],
            "tyre_sequence": ["Wet", "Intermediate", "Medium"],
            "estimated_time_loss": 44.0,
            "risk_level": "High",
        })
        strategies.append({
            "name": "Intermediate → Medium",
            "pit_stops": 1,
            "pit_windows": [int(total_laps * 0.30)],
            "tyre_sequence": ["Intermediate", "Hard"],
            "estimated_time_loss": 22.0,
            "risk_level": "Medium",
        })
    else:
        # Dry strategies
        # 1-stop
        strategies.append({
            "name": "1-Stop: Medium → Hard",
            "pit_stops": 1,
            "pit_windows": [int(total_laps * 0.42)],
            "tyre_sequence": ["Medium", "Hard"],
            "estimated_time_loss": 22.0,
            "risk_level": "Low",
        })
        # 1-stop aggressive
        strategies.append({
            "name": "1-Stop: Soft → Hard",
            "pit_stops": 1,
            "pit_windows": [int(total_laps * 0.35)],
            "tyre_sequence": ["Soft", "Hard"],
            "estimated_time_loss": 22.0,
            "risk_level": "Medium",
        })
        # 2-stop
        strategies.append({
            "name": "2-Stop: Soft → Medium → Soft",
            "pit_stops": 2,
            "pit_windows": [int(total_laps * 0.28), int(total_laps * 0.58)],
            "tyre_sequence": ["Soft", "Medium", "Soft"],
            "estimated_time_loss": 44.0,
            "risk_level": "Medium",
        })
        # 2-stop undercut
        strategies.append({
            "name": "2-Stop Undercut: Soft → Hard → Soft",
            "pit_stops": 2,
            "pit_windows": [int(total_laps * 0.22), int(total_laps * 0.55)],
            "tyre_sequence": ["Soft", "Hard", "Soft"],
            "estimated_time_loss": 44.0,
            "risk_level": "High",
        })
        # 3-stop aggressive
        if total_laps > 50:
            strategies.append({
                "name": "3-Stop: Soft → Soft → Medium → Soft",
                "pit_stops": 3,
                "pit_windows": [
                    int(total_laps * 0.18),
                    int(total_laps * 0.40),
                    int(total_laps * 0.68),
                ],
                "tyre_sequence": ["Soft", "Soft", "Medium", "Soft"],
                "estimated_time_loss": 66.0,
                "risk_level": "Very High",
            })

    # Add pace estimate per strategy
    for s in strategies:
        tyre_penalty = sum(TYRE_PACE.get(t, 0.4) for t in s["tyre_sequence"]) / len(s["tyre_sequence"])
        s["pace_score"] = round(10 - s["estimated_time_loss"] / 10 - tyre_penalty, 2)

    return strategies


def _rank_strategies(strategies: List[Dict], position: int, weather: str) -> List[Dict]:
    """Rank strategies based on position and conditions."""
    for s in strategies:
        score = s.get("pace_score", 0)
        # Reward aggressive strategies for midfield drivers trying to gain positions
        if position > 5 and s["pit_stops"] >= 2:
            score += 0.5
        # Penalize risky strategies in wet conditions
        if weather == "Wet" and s["risk_level"] == "Very High":
            score -= 1.0
        s["overall_score"] = round(score, 2)

    return sorted(strategies, key=lambda x: x["overall_score"], reverse=True)


def _tactical_notes(position: int, weather: str, track: str) -> List[str]:
    notes = []
    if position <= 3:
        notes.append("🏆 You're in podium position — protect your tyres and react to rivals' pit stops")
        notes.append("📡 Cover the undercut: pit within 2 laps of your direct rivals")
    elif position <= 10:
        notes.append("⚡ Opportunity to gain: try an undercut on the car ahead")
        notes.append("🎯 Target: jump 2-3 positions with well-timed pit stop")
    else:
        notes.append("🔄 Overcut strategy: stay out longer than rivals on fresher tyres")
        notes.append("🎲 High-risk strategy is your best chance for points")

    if weather == "Wet":
        notes.append("🌧️ Weather critical: watch for track drying — transition window is key")
        notes.append("⚠️ Safety car likely — be ready to pit under SC if opportunity arises")
    elif weather == "Mixed":
        notes.append("🌤️ Changing conditions — have both wet and dry options ready")

    notes.append(f"📍 Track: {track} — monitor tyre wear in sector 2 carefully")
    return notes
