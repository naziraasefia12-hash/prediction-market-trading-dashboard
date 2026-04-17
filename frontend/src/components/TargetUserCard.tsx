import { FormEvent, useState } from "react";
import Card from "./Card";

type Props = { targetUser: string; onSubmit: (wallet: string) => Promise<void> };

export default function TargetUserCard({ targetUser, onSubmit }: Props) {
  const [value, setValue] = useState(targetUser);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setBusy(true);
    try { await onSubmit(value.trim()); } finally { setBusy(false); }
  };

  const isMonitoring = Boolean(targetUser);

  return (
    <Card
      title="Target Wallet"
      subtitle="Paste a Polymarket proxyWallet address to monitor. Trades are detected every 5 seconds."
      badge={
        isMonitoring ? (
          <span className="chip chip-neon chip-live ml-1">
            <span className="pulse-ring-wrap">
              <span className="h-1.5 w-1.5 rounded-full bg-neon pulse-dot" />
            </span>
            Monitoring
          </span>
        ) : (
          <span className="chip chip-mist ml-1">Idle</span>
        )
      }
    >
      {/* active target display */}
      {targetUser && (
        <div className="mb-3.5 flex items-center gap-3 rounded-xl border border-neon/15 bg-neon/[0.04] px-4 py-2.5 transition hover:border-neon/25 hover:bg-neon/[0.07]">
          <div className="pulse-ring-wrap shrink-0">
            <div className="h-2 w-2 rounded-full bg-neon pulse-dot" />
          </div>
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-neon/80">{targetUser}</span>
        </div>
      )}

      <form className="flex flex-col gap-2.5 sm:flex-row" onSubmit={handleSubmit}>
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="0x… proxyWallet address"
          className="input-premium min-w-0 flex-1 px-4 py-2.5 font-mono text-sm"
        />
        <button
          type="submit"
          disabled={busy || !value.trim()}
          className="btn-primary shrink-0 rounded-xl border border-paper/25 bg-paper/[0.08] px-5 py-2.5 text-sm font-bold text-paper hover:bg-paper/[0.16] hover:border-paper/40 transition disabled:opacity-40"
        >
          {busy ? "Saving…" : isMonitoring ? "Update" : "Start Monitoring"}
        </button>
      </form>

      <p className="mt-3 text-[11px] text-mist/40">
        Find active traders on the Polymarket leaderboard and paste their wallet address above.
      </p>
    </Card>
  );
}
