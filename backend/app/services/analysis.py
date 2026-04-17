from __future__ import annotations

from datetime import UTC, datetime
from statistics import mean


def clamp(value: float, minimum: float = 0.0, maximum: float = 100.0) -> float:
    return max(minimum, min(maximum, value))


def build_trade_analysis(
    *,
    market_name: str,
    current_odds: float,
    liquidity: float,
    volume_24h: float,
    historical_accuracy: float,
    end_date: str | None = None,
) -> dict:
    implied_probability = clamp(current_odds * 100)
    liquidity_score = clamp((liquidity / 25000) * 100)
    volume_score = clamp((volume_24h / 20000) * 100)

    time_remaining_hours = None
    urgency_factor = 50.0
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            time_remaining_hours = max((end_dt - datetime.now(UTC)).total_seconds() / 3600, 0)
            urgency_factor = clamp(100 - min(time_remaining_hours, 168) / 168 * 100)
        except ValueError:
            time_remaining_hours = None

    estimated_win_probability = clamp(
        mean(
            [
                implied_probability,
                liquidity_score * 0.35 + 20,
                volume_score * 0.25 + 25,
                historical_accuracy,
                100 - urgency_factor * 0.25,
            ]
        )
    )
    confidence_score = clamp(
        estimated_win_probability * 0.55
        + liquidity_score * 0.15
        + volume_score * 0.15
        + historical_accuracy * 0.15
    )

    reasons = [
        f"Market odds imply roughly {implied_probability:.1f}% probability.",
        f"Liquidity of ${liquidity:,.0f} provides a depth score of {liquidity_score:.1f}.",
        f"24h volume of ${volume_24h:,.0f} suggests activity score {volume_score:.1f}.",
        f"Comparable-market baseline accuracy is {historical_accuracy:.1f}%.",
    ]
    if time_remaining_hours is not None:
        reasons.append(f"About {time_remaining_hours:.1f} hours remain until resolution.")

    return {
        "market_name": market_name,
        "current_odds": round(current_odds, 4),
        "implied_probability": round(implied_probability, 2),
        "estimated_win_probability": round(estimated_win_probability, 2),
        "confidence_score": round(confidence_score, 2),
        "liquidity": round(liquidity, 2),
        "volume_24h": round(volume_24h, 2),
        "time_remaining_hours": None if time_remaining_hours is None else round(time_remaining_hours, 2),
        "reasoning": " ".join(reasons),
    }

