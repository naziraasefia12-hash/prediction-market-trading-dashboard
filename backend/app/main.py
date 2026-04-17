from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from app.api.routes import router
from app.core.config import get_settings
from app.db.init_db import init_db
from app.services.monitor import monitor_service
from app.websocket.manager import connection_manager


settings = get_settings()
limiter = Limiter(key_func=get_remote_address, default_limits=["10/second"])


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    monitor_service.start()
    yield
    await monitor_service.stop()


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)


@app.get("/health")
def health() -> dict:
    return {"ok": True, "environment": settings.app_env}


@app.websocket("/ws/trades")
async def trades_websocket(websocket: WebSocket) -> None:
    await connection_manager.connect("trades", websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        connection_manager.disconnect("trades", websocket)
