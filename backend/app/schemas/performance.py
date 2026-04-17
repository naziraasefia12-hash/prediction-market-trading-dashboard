from pydantic import BaseModel


class PerformanceResponse(BaseModel):
    win_rate: float
    total_profit_loss: float
    average_odds: float
    roi: float
    biggest_win: float
    biggest_loss: float
    total_trades: int
    winning_trades: int
    pending_trades: int
    paper_trades: int
    total_staked: float


class BalanceResponse(BaseModel):
    wallet_address: str
    usdc_balance: float
    low_balance: bool
