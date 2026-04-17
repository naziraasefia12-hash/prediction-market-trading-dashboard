# Polymarket Copy Trader

Full-stack tool for monitoring a Polymarket wallet and mirroring its trades locally. Defaults to **PAPER mode** — all copy trades are simulated with no real funds required.

## Architecture

```
frontend/   React 18 + TypeScript + Tailwind dashboard
backend/    FastAPI + SQLite — monitoring, analysis, copy-intent generation, WebSocket
```

The backend monitors a target wallet on Polymarket, analyses each detected trade, and emits copy intents. In PAPER mode the intents are confirmed immediately with a synthetic reference. In LIVE mode they remain `PENDING_SIGNATURE` and require a real MetaMask transaction.

---

## Quick start

### 1. Environment

```bash
cp .env.example backend/.env
cp .env.example frontend/.env
```

Edit `backend/.env` — the only required change for local testing is `SESSION_SECRET`:
```
SESSION_SECRET=any-random-string-here
```

Leave `TRADING_MODE=PAPER` (the default). That is the safe mode; no real funds are touched.

### 2. Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Safe paper-trading test flow

1. **Connect wallet** — click "Connect Wallet" and sign the MetaMask challenge. This creates your local user record; no on-chain transaction is made.

2. **Set a target wallet** — paste any active Polymarket trader's address (their proxy wallet) into the "Monitor Wallet" field and click Save. You can find active traders on [polymarket.com](https://polymarket.com) leaderboards.

3. **Wait for the monitor** — the backend polls every 5 seconds. Each new trade found appears in the "Live Feed" panel. Backend logs look like:
   ```
   [Monitor] Trade detected: Will X happen | YES @ 0.6500 | size=150.0
   [Monitor] Auto-copy (PAPER): Will X happen | $48.75 | status=PAPER
   ```

4. **Check My Trades** — confirmed paper trades appear in the Trade History table with `status=PAPER` and a `paper_<id>` reference hash. No real USDC is spent.

5. **Manual copy** — click the "Copy" button on any live feed trade. In PAPER mode the trade is saved instantly.

6. **Settings** — adjust Max Bet, Confidence Threshold, and toggle Auto-Copy in the Settings panel. Auto-copy triggers on every newly detected trade when enabled.

---

## Enabling LIVE mode (real execution)

> **Only do this if you understand the risks and have funds to spend.**

Prerequisites:
- A funded Polygon USDC wallet connected to MetaMask
- A Polymarket account (proxy wallet created via their UI)

Steps:
1. In `backend/.env`, set `TRADING_MODE=LIVE`
2. Real copy trades will be created with `status=PENDING_SIGNATURE`
3. Wire the MetaMask signing flow in `frontend/src/pages/App.tsx` → `handleManualCopy` (the placeholder comment is already there)
4. Call `POST /api/confirm-copy` with the real `transaction_hash` and `status=CONFIRMED` after the on-chain tx lands

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `TRADING_MODE` | `PAPER` | `PAPER` or `LIVE` |
| `SESSION_SECRET` | `change-me` | Secret for session token signing — **change this** |
| `MONITOR_INTERVAL_SECONDS` | `5` | How often to poll the target wallet |
| `LOW_BALANCE_THRESHOLD` | `25` | USDC balance that triggers a warning (LIVE only) |
| `VITE_API_BASE_URL` | `http://localhost:8000` | Backend URL seen by browser |
| `VITE_WS_URL` | `ws://localhost:8000/ws/trades` | WebSocket URL |

---

## What real LIVE trading still needs

- MetaMask transaction signing wired into `handleManualCopy` in `App.tsx`
- Polygon USDC approval + Polymarket CLOB order placement (via Polymarket SDK or direct contract calls)
- Real balance fetch from Polygon RPC instead of the simulated $500 baseline
- HTTPS in production; restrict `ALLOWED_ORIGINS` to your frontend domain
- Replace SQLite with Postgres for any multi-instance deployment

---

## Deployment

- **Frontend**: Vercel, Netlify, or any static host
- **Backend**: Railway, Render, Fly.io, or a Docker host
- **Database**: SQLite for single-node; swap to Postgres with minimal ORM changes
