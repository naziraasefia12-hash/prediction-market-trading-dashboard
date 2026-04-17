from __future__ import annotations

import asyncio
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.balance import BalanceHistory
from app.models.trade import TargetTrade
from app.models.user import User
from app.services.audit import create_audit_log
from app.services.execution import build_execution_payload, create_copy_intent
from app.services.polymarket import polymarket_client
from app.websocket.manager import connection_manager


class MonitorService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._task: asyncio.Task | None = None
        self._running = False

    def start(self) -> None:
        if self._task is None:
            self._running = True
            self._task = asyncio.create_task(self._loop())

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    async def _loop(self) -> None:
        while self._running:
            db = SessionLocal()
            try:
                await self._poll_users(db)
            finally:
                db.close()
            await asyncio.sleep(self.settings.monitor_interval_seconds)

    async def _poll_users(self, db: Session) -> None:
        users = db.query(User).filter(User.target_user.is_not(None)).all()
        for user in users:
            await self._poll_user(db, user)

    async def _poll_user(self, db: Session, user: User) -> None:
        trades = await polymarket_client.fetch_user_trades(user.target_user or "")

        for trade in trades:
            # Build a stable unique ID: prefer transactionHash, fall back to id, then composite.
            external_id = str(
                trade.get("transactionHash")
                or trade.get("id")
                or "{}-{}-{}".format(
                    trade.get("proxyWallet", ""),
                    trade.get("timestamp", ""),
                    trade.get("asset", ""),
                )
            ).strip()

            if not external_id:
                continue

            if db.query(TargetTrade).filter(TargetTrade.polymarket_trade_id == external_id).first():
                continue

            # Resolve market metadata (slug preferred for analysis).
            market_ref = (
                trade.get("slug")
                or trade.get("eventSlug")
                or trade.get("market_slug")
                or trade.get("market")
                or ""
            )

            if market_ref:
                analysis = await polymarket_client.analyze_market(str(market_ref))
            else:
                analysis = {
                    "market_id": None,
                    "market_name": trade.get("title") or "Unknown market",
                    "current_odds": float(trade.get("price") or 0.5),
                    "confidence_score": 65.0,
                    "reasoning": "Trade detected; market metadata unavailable.",
                    "odds_history": [],
                }

            # Normalize Polymarket side/outcome to YES or NO.
            raw_outcome = str(trade.get("outcome") or trade.get("side") or "YES").upper()
            outcome = "YES" if raw_outcome in ("YES", "BUY") else "NO"

            market_name = (
                trade.get("title")
                or analysis.get("market_name")
                or "Unknown market"
            )

            target_trade = TargetTrade(
                user_id=user.id,
                polymarket_trade_id=external_id,
                market_id=analysis.get("market_id"),
                market_name=market_name,
                outcome=outcome,
                amount_bet=float(trade.get("size") or 0),
                odds_at_bet=float(trade.get("price") or analysis.get("current_odds", 0.5)),
                confidence_score=float(analysis.get("confidence_score", 65.0)),
                reasoning=analysis.get("reasoning", "No analysis available."),
                detected_at=datetime.now(UTC),
            )
            db.add(target_trade)
            db.commit()
            db.refresh(target_trade)

            print(
                f"[Monitor] Trade detected: {target_trade.market_name} | "
                f"{target_trade.outcome} @ {target_trade.odds_at_bet:.4f} | "
                f"size={target_trade.amount_bet}"
            )

            await connection_manager.broadcast(
                "trades",
                {
                    "type": "target_trade_detected",
                    "trade": {
                        "id": target_trade.id,
                        "market_name": target_trade.market_name,
                        "outcome": target_trade.outcome,
                        "amount_bet": target_trade.amount_bet,
                        "odds_at_bet": target_trade.odds_at_bet,
                        "confidence_score": target_trade.confidence_score,
                        "detected_at": target_trade.detected_at.isoformat(),
                    },
                },
            )

            balance = self._record_balance_snapshot(db, user)

            # Low-balance alert is only meaningful in LIVE mode.
            if (
                self.settings.trading_mode.upper() == "LIVE"
                and balance <= self.settings.low_balance_threshold
            ):
                await connection_manager.broadcast(
                    "trades",
                    {
                        "type": "low_balance_warning",
                        "wallet_address": user.wallet_address,
                        "balance": balance,
                    },
                )

            if user.auto_copy_enabled:
                # Paper mode: pass a generous virtual balance so amount sizing is
                # driven by max_bet_amount, not a potentially depleted snapshot.
                copy_balance = balance if self.settings.trading_mode.upper() == "LIVE" else 1000.0
                copy = create_copy_intent(db, user, target_trade, copy_balance)

                print(
                    f"[Monitor] Auto-copy ({self.settings.trading_mode}): "
                    f"{copy.market_name} | ${copy.amount_bet} | status={copy.status}"
                )

                await connection_manager.broadcast(
                    "trades",
                    {
                        "type": "copy_intent_created",
                        "wallet_address": user.wallet_address,
                        "copy_intent": build_execution_payload(copy),
                    },
                )
                create_audit_log(
                    db,
                    user.id,
                    "copy_intent_created",
                    {
                        "target_trade_id": target_trade.id,
                        "my_trade_id": copy.id,
                        "mode": self.settings.trading_mode,
                    },
                )

    def _record_balance_snapshot(self, db: Session, user: User) -> float:
        baseline = 500.0
        executed = sum(trade.amount_bet for trade in user.my_trades if trade.status != "FAILED")
        realized = sum(
            trade.profit_loss or 0
            for trade in user.my_trades
            if trade.result in {"WON", "LOST"}
        )
        balance = round(max(baseline - executed + realized, 0), 2)
        snapshot = BalanceHistory(user_id=user.id, balance=balance)
        db.add(snapshot)
        db.commit()
        return balance


monitor_service = MonitorService()
