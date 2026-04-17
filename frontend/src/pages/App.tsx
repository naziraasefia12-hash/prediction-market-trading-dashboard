import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Header from "../components/Header";
import TargetUserCard from "../components/TargetUserCard";
import PerformanceGrid from "../components/PerformanceGrid";
import SettingsPanel from "../components/SettingsPanel";
import TradeFeed from "../components/TradeFeed";
import MarketChartPanel from "../components/MarketChartPanel";
import TradeHistoryTable from "../components/TradeHistoryTable";
import AlertsPanel from "../components/AlertsPanel";
import { useWallet } from "../hooks/useWallet";
import { useTradeSocket } from "../hooks/useTradeSocket";
import {
  fetchAlerts, fetchBalance, fetchMarketAnalysis, fetchMyTrades,
  fetchPerformance, fetchSettings, fetchTargetTrades,
  manualCopyTrade, setTargetUser, updateSettings,
} from "../api/trading";
import type {
  AlertItem, BalanceSnapshot, MarketAnalysis, MyTrade,
  PerformanceSnapshot, SocketMessage, TargetTrade, UserSettings,
} from "../types";

const fallbackSettings: UserSettings = {
  id: 0, wallet_address: "", target_user: null,
  max_bet_amount: 75, auto_copy_enabled: false,
  copy_delay_seconds: 5, min_confidence_score: 65,
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
};
const fallbackPerformance: PerformanceSnapshot = {
  win_rate: 0, total_profit_loss: 0, average_odds: 0, roi: 0,
  biggest_win: 0, biggest_loss: 0, total_trades: 0, winning_trades: 0,
  pending_trades: 0, paper_trades: 0, total_staked: 0,
};
const BANNER_CLASSES = {
  info:    "border-neon/25    bg-neon/[0.06]    text-neon",
  success: "border-success/25 bg-success/[0.06] text-success",
  warn:    "border-amber/25   bg-amber/[0.06]   text-amber",
} as const;

function BackgroundFX() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      <div className="bg-orb-neon" />
      <div className="bg-orb-violet" />
      <div className="bg-orb-indigo" />
    </div>
  );
}

export default function App() {
  const wallet = useWallet();
  const [settings, setSettingsState] = useState<UserSettings>(fallbackSettings);
  const [targetTrades, setTargetTrades] = useState<TargetTrade[]>([]);
  const [myTrades, setMyTrades] = useState<MyTrade[]>([]);
  const [performance, setPerformance] = useState<PerformanceSnapshot>(fallbackPerformance);
  const [balance, setBalance] = useState<BalanceSnapshot | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ text: string; kind: keyof typeof BANNER_CLASSES } | null>(null);
  const settingsRef = useRef(settings);

  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => {
    if (!banner) return;
    const id = window.setTimeout(() => setBanner(null), 5000);
    return () => clearTimeout(id);
  }, [banner]);

  const showBanner = useCallback(
    (text: string, kind: keyof typeof BANNER_CLASSES = "info") => setBanner({ text, kind }),
    [],
  );
  const refresh = useCallback(async () => {
    try {
      const [s, tt, mt, perf, bal, al] = await Promise.all([
        fetchSettings(), fetchTargetTrades(), fetchMyTrades(),
        fetchPerformance(), fetchBalance(), fetchAlerts(),
      ]);
      setSettingsState(s); setTargetTrades(tt); setMyTrades(mt);
      setPerformance(perf); setBalance(bal); setAlerts(al);
    } catch (err) {
      showBanner(err instanceof Error ? err.message : "Failed to load data.", "warn");
    }
  }, [showBanner]);

  useEffect(() => { if (localStorage.getItem("pmct.session")) void refresh(); }, [refresh]);

  const handleSocketMessage = useCallback((message: SocketMessage) => {
    if (message.type === "target_trade_detected") {
      showBanner(`Trade detected: ${message.trade.market_name ?? "Unknown market"}`, "info");
      void refresh();
    }
    if (message.type === "copy_intent_created") {
      showBanner(`Paper copy saved: ${message.copy_intent.market_name}`, "success");
      void refresh();
    }
    if (message.type === "low_balance_warning") {
      showBanner(`Low balance: $${message.balance.toFixed(2)} remaining`, "warn");
    }
  }, [refresh, showBanner]);

  useTradeSocket(handleSocketMessage);

  const handleConnect = async () => {
    const address = await wallet.connect();
    if (address) { showBanner("Wallet connected.", "success"); await refresh(); }
  };
  const handleTargetSubmit = async (addr: string) => {
    const next = await setTargetUser(addr);
    setSettingsState(next);
    showBanner("Monitoring started.", "success");
    await refresh();
  };
  const handleSaveSettings = async (payload: {
    max_bet_amount: number; auto_copy_enabled: boolean;
    copy_delay_seconds: number; min_confidence_score: number;
  }) => {
    const next = await updateSettings(payload);
    setSettingsState(next);
    showBanner("Settings saved.", "success");
  };
  const handleAnalyze = async (trade: TargetTrade) => {
    setIsAnalyzing(true); setAnalyzeError(null); setAnalysis(null);
    try {
      const slug = trade.market_id ?? trade.polymarket_trade_id;
      if (!slug || slug.length < 2) throw new Error("This trade has no usable market identifier for analysis.");
      setAnalysis(await fetchMarketAnalysis(slug));
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Analysis request failed.");
    } finally { setIsAnalyzing(false); }
  };
  const handleManualCopy = async (trade: TargetTrade) => {
    try {
      const response = await manualCopyTrade(trade.id);
      if (response.execution_payload.execution_mode === "paper") {
        showBanner(`Paper copy saved for "${trade.market_name}".`, "success");
      } else {
        showBanner("Live trade queued — MetaMask signing required.", "warn");
      }
      await refresh();
    } catch (err) {
      showBanner(err instanceof Error ? err.message : "Copy trade failed.", "warn");
    }
  };

  const connected = useMemo(
    () => wallet.connected || Boolean(localStorage.getItem("pmct.session")),
    [wallet.connected],
  );

  return (
    <>
      <BackgroundFX />
      <main className="relative z-10 min-h-screen px-4 py-5 md:px-8">
        <div className="mx-auto max-w-7xl space-y-5">
          <Header
            address={wallet.address}
            onConnect={handleConnect}
            connecting={wallet.connecting}
            monitoring={Boolean(settings.target_user)}
            targetUser={settings.target_user}
          />

          {wallet.error && (
            <div className="rounded-xl border border-rose/20 bg-rose/[0.06] px-4 py-3 text-sm text-rose/90 animate-slide-down">
              {wallet.error}
            </div>
          )}

          {banner && (
            <div className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-semibold animate-slide-down ${BANNER_CLASSES[banner.kind]}`}>
              <span>{banner.text}</span>
              <button className="opacity-40 hover:opacity-100 transition-opacity text-xs" onClick={() => setBanner(null)}>✕</button>
            </div>
          )}

          {!connected ? (
            <WelcomeScreen onConnect={handleConnect} connecting={wallet.connecting} />
          ) : (
            <>
              <div className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
                <TargetUserCard targetUser={settings.target_user ?? ""} onSubmit={handleTargetSubmit} />
                <SettingsPanel settings={settings} balance={balance} onSave={handleSaveSettings} />
              </div>
              <PerformanceGrid performance={performance} />
              <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
                <TradeFeed trades={targetTrades} onAnalyze={handleAnalyze} onManualCopy={handleManualCopy} analyzingId={isAnalyzing ? "pending" : null} />
                <MarketChartPanel analysis={analysis} loading={isAnalyzing} error={analyzeError} />
              </div>
              <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
                <TradeHistoryTable trades={myTrades} />
                <AlertsPanel alerts={alerts} />
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}

function WelcomeScreen({ onConnect, connecting }: { onConnect: () => void; connecting: boolean }) {
  return (
    <div className="glass-panel relative overflow-hidden animate-fade-in">
      {/* ambient gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-paper/[0.06] via-transparent to-neon/[0.04] pointer-events-none" />

      <div className="relative flex flex-col items-center px-8 py-24 text-center">
        {/* animated icon */}
        <div className="relative mb-8">
          <div className="absolute -inset-6 rounded-full bg-neon/10 blur-2xl animate-glow-pulse" />
          <div className="absolute -inset-3 rounded-2xl bg-paper/10 blur-xl animate-glow-pulse" style={{ animationDelay: '1s' }} />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl border border-neon/20 bg-neon/[0.06]">
            <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="url(#g1)" strokeWidth="1.5" />
              <polyline points="8 12 11 15 16 9" stroke="url(#g1)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="24" y2="24">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        <div className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-neon/60">Paper Trading</div>
        <h1 className="text-4xl font-black leading-tight tracking-tight">
          <span className="gradient-text-brand">Polymarket</span>
          <br />
          <span className="text-white">Copy Trader</span>
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-mist/60">
          Connect your wallet to start monitoring top Polymarket traders and simulate copy trades — no real funds at risk.
        </p>

        <button
          className="btn-gradient mt-10 rounded-xl px-14 py-3.5 text-sm disabled:opacity-50"
          onClick={onConnect}
          disabled={connecting}
        >
          {connecting ? "Connecting…" : "Connect MetaMask"}
        </button>
        <p className="mt-4 text-xs text-mist/35">Signing only · No on-chain transaction</p>
      </div>
    </div>
  );
}
