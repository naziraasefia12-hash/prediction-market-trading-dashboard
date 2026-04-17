from __future__ import annotations

import json
from collections import defaultdict

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, channel: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections[channel].append(websocket)

    def disconnect(self, channel: str, websocket: WebSocket) -> None:
        if websocket in self._connections.get(channel, []):
            self._connections[channel].remove(websocket)
        if not self._connections.get(channel):
            self._connections.pop(channel, None)

    async def broadcast(self, channel: str, payload: dict) -> None:
        dead_connections: list[WebSocket] = []
        for websocket in self._connections.get(channel, []):
            try:
                await websocket.send_text(json.dumps(payload, default=str))
            except Exception:
                dead_connections.append(websocket)
        for websocket in dead_connections:
            self.disconnect(channel, websocket)


connection_manager = ConnectionManager()

