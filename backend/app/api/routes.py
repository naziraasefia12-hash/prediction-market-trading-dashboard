from __future__ import annotations

from datetime import UTC, datetime

from eth_utils import to_checksum_address
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_timestamp
from app.core.config import get_settings
from app.core.security import build_sign_in_message, consume_nonce, create_nonce, create_session_token, verify_wallet_signature
from app.db.session import get_db
from app.models.balance import BalanceHistory
from app.models.trade import MyTrade, TargetTrade
from app.models.user import User
from app.schemas.performance import BalanceResponse, PerformanceResponse
from app.schemas.trade import (
    AnalyzeMarketResponse,
    ConfirmCopyTradeRequest,
    ManualCopyTradeRequest,
    MyTradeResponse,
    TargetTradeResponse,
)
from app.schemas.user import (
    ConnectWalletRequest,
    ConnectWalletVerifyRequest,
    SessionResponse,
    SetTargetUserRequest,
    UpdateSettingsRequest,
    UserSettingsResponse,
)
from app.services.audit import create_audit_log
from app.services.execution import build_execution_payload, create_copy_intent
from app.services.performance import get_performance_snapshot
from app.services.polymarket import polymarket_client
router = APIRouter(prefix="/api")


@router.post("/connect-wallet")
def connect_wallet(payload: ConnectWalletRequest, db: Session = Depends(get_db)) -> dict:
    wallet_address = to_checksum_address(payload.wallet_address)
    nonce = create_nonce(wallet_address)
    message = build_sign_in_message(wallet_address, nonce)
    user = db.query(User).filter(User.wallet_address == wallet_address).first()
    if not user:
        user = User(wallet_address=wallet_address)
        db.add(user)
        db.commit()
    return {"wallet_address": wallet_address, "nonce": nonce, "message": message}


@router.post("/connect-wallet/verify", response_model=SessionResponse, dependencies=[Depends(require_timestamp)])
def verify_wallet(
    payload: ConnectWalletVerifyRequest,
    db: Session = Depends(get_db),
) -> SessionResponse:
    wallet_address = to_checksum_address(payload.wallet_address)
    if not consume_nonce(wallet_address, payload.nonce):
        raise HTTPException(status_code=400, detail="Expired or invalid nonce")
    if not verify_wallet_signature(wallet_address, payload.message, payload.signature):
        raise HTTPException(status_code=400, detail="Signature verification failed")
    token = create_session_token(wallet_address)
    create_audit_log(db, None, "wallet_connected", {"wallet_address": wallet_address})
    return SessionResponse(
        token=token,
        wallet_address=wallet_address,
        expires_in_seconds=60 * 60 * 12,
    )


@router.post("/set-target-user", response_model=UserSettingsResponse, dependencies=[Depends(require_timestamp)])
def set_target_user(
    payload: SetTargetUserRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    user.target_user = to_checksum_address(payload.target_user)
    db.add(user)
    db.commit()
    db.refresh(user)
    create_audit_log(db, user.id, "target_user_updated", {"target_user": user.target_user})
    return user


@router.get("/target-trades", response_model=list[TargetTradeResponse])
def list_target_trades(
    market: str | None = Query(default=None),
    outcome: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[TargetTrade]:
    query = db.query(TargetTrade).filter(TargetTrade.user_id == user.id)
    if market:
        query = query.filter(TargetTrade.market_name.ilike(f"%{market}%"))
    if outcome:
        query = query.filter(TargetTrade.outcome == outcome.upper())
    return query.order_by(TargetTrade.detected_at.desc()).limit(100).all()


@router.get("/my-trades", response_model=list[MyTradeResponse])
def list_my_trades(
    status: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[MyTrade]:
    query = db.query(MyTrade).filter(MyTrade.user_id == user.id)
    if status:
        query = query.filter(MyTrade.status == status.upper())
    return query.order_by(MyTrade.created_at.desc()).limit(100).all()


@router.get("/performance", response_model=PerformanceResponse)
def get_performance(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    return get_performance_snapshot(db, user.id)


@router.post("/update-settings", response_model=UserSettingsResponse, dependencies=[Depends(require_timestamp)])
def update_settings(
    payload: UpdateSettingsRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    user.max_bet_amount = payload.max_bet_amount
    user.auto_copy_enabled = payload.auto_copy_enabled
    user.copy_delay_seconds = payload.copy_delay_seconds
    user.min_confidence_score = payload.min_confidence_score
    db.add(user)
    db.commit()
    db.refresh(user)
    create_audit_log(
        db,
        user.id,
        "settings_updated",
        {
            "max_bet_amount": payload.max_bet_amount,
            "auto_copy_enabled": payload.auto_copy_enabled,
            "copy_delay_seconds": payload.copy_delay_seconds,
            "min_confidence_score": payload.min_confidence_score,
        },
    )
    return user


@router.get("/balance", response_model=BalanceResponse)
def get_balance(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> BalanceResponse:
    snapshot = (
        db.query(BalanceHistory)
        .filter(BalanceHistory.user_id == user.id)
        .order_by(BalanceHistory.timestamp.desc())
        .first()
    )
    balance = snapshot.balance if snapshot else 0.0
    return BalanceResponse(
        wallet_address=user.wallet_address,
        usdc_balance=balance,
        low_balance=balance <= get_settings().low_balance_threshold,
    )


@router.post("/manual-copy-trade", dependencies=[Depends(require_timestamp)])
def manual_copy_trade(
    payload: ManualCopyTradeRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    target_trade = (
        db.query(TargetTrade)
        .filter(TargetTrade.id == payload.target_trade_id, TargetTrade.user_id == user.id)
        .first()
    )
    if not target_trade:
        raise HTTPException(status_code=404, detail="Target trade not found")
    snapshot = (
        db.query(BalanceHistory)
        .filter(BalanceHistory.user_id == user.id)
        .order_by(BalanceHistory.timestamp.desc())
        .first()
    )
    real_balance = snapshot.balance if snapshot else 0.0
    # Paper mode sizes off max_bet_amount; pass a generous virtual balance.
    balance = 1000.0 if get_settings().trading_mode.upper() == "PAPER" else real_balance
    my_trade = create_copy_intent(db, user, target_trade, balance)
    create_audit_log(db, user.id, "manual_copy_requested", {"target_trade_id": target_trade.id})
    return {"trade": MyTradeResponse.model_validate(my_trade), "execution_payload": build_execution_payload(my_trade)}


@router.post("/confirm-copy", response_model=MyTradeResponse, dependencies=[Depends(require_timestamp)])
def confirm_copy_trade(
    payload: ConfirmCopyTradeRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MyTrade:
    my_trade = db.query(MyTrade).filter(MyTrade.id == payload.my_trade_id, MyTrade.user_id == user.id).first()
    if not my_trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    my_trade.transaction_hash = payload.transaction_hash
    my_trade.status = payload.status
    db.add(my_trade)
    db.commit()
    db.refresh(my_trade)
    create_audit_log(
        db,
        user.id,
        "copy_confirmed",
        {"my_trade_id": my_trade.id, "status": my_trade.status, "transaction_hash": my_trade.transaction_hash},
    )
    return my_trade


@router.get("/analyze-market", response_model=AnalyzeMarketResponse)
async def analyze_market(
    market_slug: str = Query(..., min_length=2),
    user: User = Depends(get_current_user),
) -> dict:
    _ = user
    return await polymarket_client.analyze_market(market_slug)


@router.get("/settings", response_model=UserSettingsResponse)
def get_settings_snapshot(user: User = Depends(get_current_user)) -> User:
    return user


@router.get("/alerts")
def get_alerts(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[dict]:
    snapshot = (
        db.query(BalanceHistory)
        .filter(BalanceHistory.user_id == user.id)
        .order_by(BalanceHistory.timestamp.desc())
        .first()
    )
    alerts = []
    if snapshot and snapshot.balance <= get_settings().low_balance_threshold:
        alerts.append(
            {
                "type": "warning",
                "title": "Low balance",
                "message": f"USDC balance dropped to ${snapshot.balance:.2f}",
                "created_at": datetime.now(UTC),
            }
        )
    recent_failures = (
        db.query(MyTrade)
        .filter(MyTrade.user_id == user.id, MyTrade.status == "FAILED")
        .order_by(MyTrade.created_at.desc())
        .limit(5)
        .all()
    )
    alerts.extend(
        {
            "type": "error",
            "title": "Failed copy trade",
            "message": f"{trade.market_name} copy failed.",
            "created_at": trade.created_at,
        }
        for trade in recent_failures
    )
    return alerts
