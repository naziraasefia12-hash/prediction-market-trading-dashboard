from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TargetTrade(Base):
    __tablename__ = "target_trades"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    polymarket_trade_id: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    market_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    market_name: Mapped[str] = mapped_column(String(255), nullable=False)
    outcome: Mapped[str] = mapped_column(String(8), nullable=False)
    amount_bet: Mapped[float] = mapped_column(Float, nullable=False)
    odds_at_bet: Mapped[float] = mapped_column(Float, nullable=False)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    reasoning: Mapped[str | None] = mapped_column(Text, nullable=True)
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    market_resolved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    market_result: Mapped[str | None] = mapped_column(String(8), nullable=True)

    user = relationship("User", back_populates="target_trades")
    my_trades = relationship("MyTrade", back_populates="target_trade")


class MyTrade(Base):
    __tablename__ = "my_trades"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    target_trade_id: Mapped[int | None] = mapped_column(ForeignKey("target_trades.id"), nullable=True)
    market_name: Mapped[str] = mapped_column(String(255), nullable=False)
    outcome: Mapped[str] = mapped_column(String(8), nullable=False)
    amount_bet: Mapped[float] = mapped_column(Float, nullable=False)
    odds_at_bet: Mapped[float] = mapped_column(Float, nullable=False)
    transaction_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="PENDING", nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    result: Mapped[str | None] = mapped_column(String(16), nullable=True)
    profit_loss: Mapped[float | None] = mapped_column(Float, nullable=True)

    user = relationship("User", back_populates="my_trades")
    target_trade = relationship("TargetTrade", back_populates="my_trades")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    details: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="audit_logs")

