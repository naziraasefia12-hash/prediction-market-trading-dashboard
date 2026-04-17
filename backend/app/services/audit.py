from __future__ import annotations

import json

from sqlalchemy.orm import Session

from app.models.trade import AuditLog


def create_audit_log(db: Session, user_id: int | None, action: str, details: dict) -> None:
    entry = AuditLog(user_id=user_id, action=action, details=json.dumps(details, default=str))
    db.add(entry)
    db.commit()

