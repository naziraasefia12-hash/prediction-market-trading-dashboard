from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.trade import MyTrade, TargetTrade
from app.models.user import User


def compute_copy_amount(user: User, available_balance: float, target_trade: TargetTrade) -> float:
    settings = get_settings()
    if settings.trading_mode.upper() == "PAPER":
        # Paper mode: size off max_bet_amount; real balance is irrelevant.
        base = float(user.max_bet_amount)
    else:
        if available_balance <= 0:
            return 1.0
        base = min(user.max_bet_amount, available_balance * 0.2)
    confidence_scale = max(target_trade.confidence_score / 100, 0.25)
    return round(max(min(base * confidence_scale, user.max_bet_amount), 1), 2)


def create_copy_intent(db: Session, user: User, target_trade: TargetTrade, available_balance: float) -> MyTrade:
    settings = get_settings()
    paper_mode = settings.trading_mode.upper() == "PAPER"
    amount = compute_copy_amount(user, available_balance, target_trade)

    my_trade = MyTrade(
        user_id=user.id,
        target_trade_id=target_trade.id,
        market_name=target_trade.market_name,
        outcome=target_trade.outcome,
        amount_bet=amount,
        odds_at_bet=target_trade.odds_at_bet,
        status="PAPER" if paper_mode else "PENDING_SIGNATURE",
    )
    db.add(my_trade)
    db.commit()
    db.refresh(my_trade)

    if paper_mode:
        # Auto-confirm paper trades immediately with a synthetic reference.
        my_trade.transaction_hash = f"paper_{my_trade.id}"
        db.commit()
        db.refresh(my_trade)

    return my_trade


def build_execution_payload(my_trade: MyTrade) -> dict:
    settings = get_settings()
    paper_mode = settings.trading_mode.upper() == "PAPER"
    return {
        "my_trade_id": my_trade.id,
        "market_name": my_trade.market_name,
        "outcome": my_trade.outcome,
        "amount_bet": my_trade.amount_bet,
        "odds_at_bet": my_trade.odds_at_bet,
        "execution_mode": "paper" if paper_mode else "wallet_signature",
    }
