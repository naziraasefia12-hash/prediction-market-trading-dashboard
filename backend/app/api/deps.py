from __future__ import annotations

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import parse_session_token, validate_client_timestamp
from app.db.session import get_db
from app.models.user import User


def get_current_user(
    db: Session = Depends(get_db),
) -> User:
    user = db.query(User).first()
    if user:
        return user

    demo_user = User(
        wallet_address="0xDEMO",
        auto_copy_enabled=False,
        min_confidence_score=65.0,
        max_bet_amount=75.0,
        copy_delay_seconds=5,
    )
    db.add(demo_user)
    db.commit()
    db.refresh(demo_user)
    return demo_user


def require_timestamp(x_client_timestamp: str | None = Header(default=None)) -> None:
    try:
        validate_client_timestamp(x_client_timestamp)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

