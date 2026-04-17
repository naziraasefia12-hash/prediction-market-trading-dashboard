from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.trade import MyTrade


def get_performance_snapshot(db: Session, user_id: int) -> dict:
    trades = db.query(MyTrade).filter(MyTrade.user_id == user_id).all()
    total_trades = len(trades)

    paper_trades = [t for t in trades if t.status == "PAPER"]
    resolved_trades = [t for t in trades if t.result in {"WON", "LOST"}]
    winning_trades = [t for t in resolved_trades if t.result == "WON"]

    # Pending = not yet resolved and not failed
    pending_trades = [
        t for t in trades
        if t.status in {"PENDING", "PENDING_SIGNATURE"} and t.result is None
    ]

    pnl_values = [t.profit_loss or 0.0 for t in trades]
    total_staked = sum(t.amount_bet for t in trades)
    total_profit_loss = sum(pnl_values)
    average_odds = sum(t.odds_at_bet for t in trades) / total_trades if total_trades else 0.0

    win_rate = (len(winning_trades) / len(resolved_trades)) * 100 if resolved_trades else 0.0
    roi = (total_profit_loss / total_staked) * 100 if total_staked else 0.0

    return {
        "win_rate": round(win_rate, 2),
        "total_profit_loss": round(total_profit_loss, 2),
        "average_odds": round(average_odds, 4),
        "roi": round(roi, 2),
        "biggest_win": round(max(pnl_values), 2) if pnl_values else 0.0,
        "biggest_loss": round(min(pnl_values), 2) if pnl_values else 0.0,
        "total_trades": total_trades,
        "winning_trades": len(winning_trades),
        "pending_trades": len(pending_trades),
        "paper_trades": len(paper_trades),
        "total_staked": round(total_staked, 2),
    }
