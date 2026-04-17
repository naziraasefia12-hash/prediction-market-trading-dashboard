from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta

from eth_account import Account
from eth_account.messages import encode_defunct
from eth_utils import to_checksum_address
from itsdangerous import BadSignature, URLSafeTimedSerializer

from app.core.config import get_settings


NONCE_TTL_SECONDS = 300
SESSION_TTL_SECONDS = 60 * 60 * 12
TIMESTAMP_TOLERANCE_SECONDS = 300

_nonce_store: dict[str, tuple[str, datetime]] = {}


def create_nonce(wallet_address: str) -> str:
    normalized = to_checksum_address(wallet_address)
    nonce = secrets.token_urlsafe(16)
    _nonce_store[normalized] = (nonce, datetime.now(UTC))
    return nonce


def consume_nonce(wallet_address: str, nonce: str) -> bool:
    normalized = to_checksum_address(wallet_address)
    item = _nonce_store.get(normalized)
    if not item:
        return False
    stored_nonce, created_at = item
    valid = stored_nonce == nonce and (datetime.now(UTC) - created_at).total_seconds() <= NONCE_TTL_SECONDS
    if valid:
        _nonce_store.pop(normalized, None)
    return valid


def verify_wallet_signature(wallet_address: str, message: str, signature: str) -> bool:
    try:
        encoded = encode_defunct(text=message)
        recovered = Account.recover_message(encoded, signature=signature)
        return to_checksum_address(recovered) == to_checksum_address(wallet_address)
    except Exception:
        return False


def create_session_token(wallet_address: str) -> str:
    serializer = URLSafeTimedSerializer(get_settings().session_secret)
    return serializer.dumps(
        {
            "wallet_address": to_checksum_address(wallet_address),
            "issued_at": datetime.now(UTC).isoformat(),
        }
    )


def parse_session_token(token: str) -> dict:
    serializer = URLSafeTimedSerializer(get_settings().session_secret)
    try:
        return serializer.loads(token, max_age=SESSION_TTL_SECONDS)
    except BadSignature as exc:
        raise ValueError("Invalid session token") from exc


def validate_client_timestamp(timestamp: str | None) -> None:
    if not timestamp:
        raise ValueError("Missing X-Client-Timestamp header")
    try:
        client_time = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError("Invalid client timestamp") from exc
    delta = abs((datetime.now(UTC) - client_time).total_seconds())
    if delta > TIMESTAMP_TOLERANCE_SECONDS:
        raise ValueError("Request timestamp outside allowed window")


def build_sign_in_message(wallet_address: str, nonce: str) -> str:
    expires_at = datetime.now(UTC) + timedelta(seconds=NONCE_TTL_SECONDS)
    return (
        f"Sign in to Polymarket Copy Trader\n"
        f"Wallet: {to_checksum_address(wallet_address)}\n"
        f"Nonce: {nonce}\n"
        f"Expires: {expires_at.isoformat()}"
    )
