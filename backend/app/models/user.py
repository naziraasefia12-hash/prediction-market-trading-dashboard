from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    wallet_address: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    target_user: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    max_bet_amount: Mapped[float] = mapped_column(Float, default=50.0, nullable=False)
    auto_copy_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    copy_delay_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    min_confidence_score: Mapped[float] = mapped_column(Float, default=65.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    target_trades = relationship("TargetTrade", back_populates="user", cascade="all, delete-orphan")
    my_trades = relationship("MyTrade", back_populates="user", cascade="all, delete-orphan")
    balances = relationship("BalanceHistory", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")

