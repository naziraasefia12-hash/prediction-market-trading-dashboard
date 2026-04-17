from datetime import datetime

from pydantic import BaseModel, ConfigDict


class APIResponse(BaseModel):
    ok: bool = True
    message: str | None = None


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class PaginatedTrades(BaseModel):
    items: list
    total: int


class AlertEvent(BaseModel):
    type: str
    title: str
    message: str
    created_at: datetime

