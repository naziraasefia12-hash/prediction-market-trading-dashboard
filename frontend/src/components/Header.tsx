type Props = {
  address: string | null;
  onConnect: () => void;
  connecting: boolean;
  monitoring: boolean;
  targetUser: string | null;
};

export default function Header({ address, onConnect, connecting, monitoring, targetUser }: Props) {
  return (
    <header className="animate-slide-down">
      <div className="glass-panel px-5 py-3.5">
        <div className="flex items-center justify-between gap-4">

          {/* ── brand ── */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-neon/20 bg-neon/[0.06]">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="url(#hg)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                  <linearGradient id="hg" x1="0" y1="0" x2="24" y2="0">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-black tracking-tight gradient-text-brand">PMCT</span>
                <span className="hidden text-[11px] text-mist/35 sm:inline">Polymarket Copy Trader</span>
              </div>
            </div>
          </div>

          {/* ── status cluster ── */}
          <div className="flex flex-1 items-center justify-center gap-2.5">
            {/* live / idle pill */}
            <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 transition-all duration-300 ${
              monitoring
                ? "border-neon/20 bg-neon/[0.06]"
                : "border-line/60 bg-surface/60"
            }`}>
              {monitoring ? (
                <div className="pulse-ring-wrap">
                  <div className="h-2 w-2 rounded-full bg-neon pulse-dot" />
                </div>
              ) : (
                <div className="h-2 w-2 rounded-full bg-mist/30" />
              )}
              <span className={`text-[11px] font-bold uppercase tracking-wider ${monitoring ? "text-neon/80" : "text-mist/45"}`}>
                {monitoring ? "Live" : "Idle"}
              </span>
            </div>

            {/* target wallet pill — shown when monitoring */}
            {monitoring && targetUser && (
              <div className="hidden items-center gap-2 rounded-full border border-line/50 bg-surface/60 px-3 py-1.5 sm:flex">
                <span className="text-[11px] text-mist/45">watching</span>
                <span className="font-mono text-[11px] font-semibold text-mist/70">
                  {targetUser.slice(0, 6)}…{targetUser.slice(-4)}
                </span>
              </div>
            )}

            {/* paper mode badge */}
            <span className="chip chip-paper">
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70 animate-pulse" />
              Paper
            </span>
          </div>

          {/* ── wallet + connect ── */}
          <div className="flex items-center gap-2 shrink-0">
            {address && (
              <div className="hidden items-center gap-1.5 rounded-xl border border-neon/15 bg-neon/[0.05] px-3 py-1.5 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-neon pulse-dot" />
                <span className="font-mono text-[11px] font-semibold text-neon/75">
                  {address.slice(0, 6)}…{address.slice(-4)}
                </span>
              </div>
            )}
            <button
              onClick={onConnect}
              disabled={connecting}
              className={`btn-primary rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-50 transition ${
                address
                  ? "border border-line/70 bg-surface/80 text-mist hover:text-white hover:border-line"
                  : "btn-gradient"
              }`}
            >
              {address ? "Reconnect" : connecting ? "Connecting…" : "Connect Wallet"}
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
