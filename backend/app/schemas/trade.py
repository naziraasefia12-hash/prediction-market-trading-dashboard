from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common import ORMBase


class TargetTradeResponse(ORMBase):
    id: int
    polymarket_trade_id: str
    market_id: str | None
    market_name: str
    outcome: str
    amount_bet: float
    odds_at_bet: float
    confidence_score: float
    reasoning: str | None
    detected_at: datetime
    market_resolved: bool
    market_result: str | None


class MyTradeResponse(ORMBase):
    id: int
    target_trade_id: int | None
    market_name: str
    outcome: str
    amount_bet: float
    odds_at_bet: float
    transaction_hash: str | None
    status: str
    created_at: datetime
    resolved_at: datetime | None
    result: str | None
    profit_loss: float | None


class ManualCopyTradeRequest(BaseModel):
    target_trade_id: int


class ConfirmCopyTradeRequest(BaseModel):
    my_trade_id: int
    transaction_hash: str = Field(min_length=10)
    status: str = Field(pattern="^(PENDING|CONFIRMED|FAILED)$")


class AnalyzeMarketResponse(BaseModel):
    market_id: str | None
    market_name: str
    current_odds: float
    implied_probability: float
    estimated_win_probability: float
    confidence_score: float
    liquidity: float
    volume_24h: float
    time_remaining_hours: float | None
    reasoning: str
    odds_history: list[dict]

