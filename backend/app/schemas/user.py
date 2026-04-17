from datetime import datetime

from eth_utils import to_checksum_address
from pydantic import BaseModel, Field, field_validator

from app.schemas.common import ORMBase


class ConnectWalletRequest(BaseModel):
    wallet_address: str = Field(..., min_length=42, max_length=42)

    @field_validator("wallet_address")
    @classmethod
    def validate_wallet_address(cls, value: str) -> str:
        return to_checksum_address(value)


class ConnectWalletVerifyRequest(BaseModel):
    wallet_address: str
    nonce: str
    message: str
    signature: str

    @field_validator("wallet_address")
    @classmethod
    def validate_verified_wallet_address(cls, value: str) -> str:
        return to_checksum_address(value)


class SessionResponse(BaseModel):
    token: str
    wallet_address: str
    expires_in_seconds: int


class SetTargetUserRequest(BaseModel):
    target_user: str

    @field_validator("target_user")
    @classmethod
    def validate_wallet(cls, value: str) -> str:
        return to_checksum_address(value)


class UpdateSettingsRequest(BaseModel):
    max_bet_amount: float = Field(ge=10, le=500)
    auto_copy_enabled: bool
    copy_delay_seconds: int = Field(ge=0, le=30)
    min_confidence_score: float = Field(default=65, ge=0, le=100)


class UserSettingsResponse(ORMBase):
    id: int
    wallet_address: str
    target_user: str | None
    max_bet_amount: float
    auto_copy_enabled: bool
    copy_delay_seconds: int
    min_confidence_score: float
    created_at: datetime
    updated_at: datetime | None
