from __future__ import annotations

import aiohttp

from app.core.config import get_settings
from app.services.analysis import build_trade_analysis


class PolymarketClient:
    def __init__(self) -> None:
        self.settings = get_settings()

    async def _request(self, base_url: str, path: str, params: dict | None = None) -> dict | list:
        timeout = aiohttp.ClientTimeout(total=12)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(f"{base_url}{path}", params=params) as response:
                response.raise_for_status()
                return await response.json()

    async def fetch_user_trades(self, wallet_address: str, limit: int = 20) -> list[dict]:
        if not wallet_address:
            return []

        normalized_wallet = wallet_address.lower()

        # Polymarket Data API: 'user' param filters by proxyWallet address.
        params = {"user": normalized_wallet, "limit": limit}

        try:
            payload = await self._request(
                self.settings.polymarket_data_url,
                "/trades",
                params=params,
            )

            if isinstance(payload, dict):
                data = payload.get("data", [])
            elif isinstance(payload, list):
                data = payload
            else:
                data = []

            trades = [t for t in data if isinstance(t, dict)]

            # Post-filter: keep only trades whose proxyWallet/maker/owner matches.
            def _belongs(t: dict) -> bool:
                for field in ("proxyWallet", "maker", "owner", "taker"):
                    if str(t.get(field, "")).lower() == normalized_wallet:
                        return True
                return False

            filtered = [t for t in trades if _belongs(t)]
            # Fallback to all returned trades if post-filter removes everything
            # (can happen when the user provides an EOA instead of proxyWallet).
            return filtered if filtered else trades

        except Exception as exc:
            print(f"[PolymarketClient] fetch_user_trades failed for {wallet_address}: {exc}")
            return []

    async def fetch_market(self, market_id_or_slug: str) -> dict:
        """Fetch market data from the Gamma API by slug or condition ID."""
        if not market_id_or_slug:
            return {}
        try:
            # First try: query by slug via the markets endpoint.
            payload = await self._request(
                self.settings.polymarket_gamma_url,
                "/markets",
                params={"slug": market_id_or_slug, "limit": 1},
            )
            if isinstance(payload, list) and payload:
                return payload[0]
            if isinstance(payload, dict):
                candidates = (
                    payload.get("markets")
                    or payload.get("data")
                    or []
                )
                if candidates:
                    return candidates[0]
        except Exception:
            pass

        try:
            # Second try: interpret as a condition ID (direct path).
            payload = await self._request(
                self.settings.polymarket_gamma_url,
                f"/markets/{market_id_or_slug}",
            )
            if isinstance(payload, dict) and payload:
                return payload
        except Exception as exc:
            print(f"[PolymarketClient] fetch_market failed for {market_id_or_slug}: {exc}")

        return {}

    async def fetch_market_series(self, market_id_or_slug: str) -> list[dict]:
        return []

    async def analyze_market(self, market_id_or_slug: str) -> dict:
        market = await self.fetch_market(market_id_or_slug)

        prices = market.get("outcomePrices") or [0.5]
        try:
            current_odds = float(prices[0]) if prices else 0.5
        except (ValueError, TypeError):
            current_odds = 0.5

        analysis = build_trade_analysis(
            market_name=market.get("question") or market.get("title") or market_id_or_slug or "Unknown market",
            current_odds=current_odds,
            liquidity=float(market.get("liquidity") or 0),
            volume_24h=float(market.get("volume24hr") or market.get("volume24h") or 0),
            historical_accuracy=63.0,
            end_date=market.get("endDate"),
        )

        analysis["market_id"] = market.get("id") or market.get("conditionId") or market.get("slug") or market_id_or_slug
        analysis["market_name"] = market.get("question") or market.get("title") or market_id_or_slug or "Unknown market"
        analysis["current_odds"] = current_odds
        analysis["odds_history"] = []

        return analysis


polymarket_client = PolymarketClient()
