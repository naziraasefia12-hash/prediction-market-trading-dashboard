import { AnimatePresence, motion } from "framer-motion";
import Card from "./Card";
import type { TargetTrade } from "../types";
import { currency, relativeTime, potentialProfit, confidenceClass } from "../lib/format";

type Props = {
  trades: TargetTrade[];
  onAnalyze: (trade: TargetTrade) => void;
  onManualCopy: (trade: TargetTrade) => void;
  analyzingId?: string | null;
};

function OutcomeBadge({ outcome }: { outcome: "YES" | "NO" }) {
  return <span className={outcome === "YES" ? "badge-yes" : "badge-no"}>{outcome}</span>;
}

function ConfBadge({ score }: { score: number }) {
  const cls = confidenceClass(score);
  return (
    <span className={`chip ${cls} font-mono tabular-nums${score >= 70 ? " chip-live" : ""}`}>
      {score.toFixed(0)}%
    </span>
  );
}

function TradeCard({ trade, onAnalyze, onManualCopy, analyzing }: {
  trade: TargetTrade; onAnalyze: (t: TargetTrade) => void;
  onManualCopy: (t: TargetTrade) => void; analyzing: boolean;
}) {
  const profit = potentialProfit(trade.amount_bet, trade.odds_at_bet);
  const accentClass =
    trade.confidence_score >= 70 ? "trade-card-high" :
    trade.confidence_score >= 50 ? "trade-card-mid"  : "trade-card-low";

  return (
    <article className={`trade-card ${accentClass}`}>
      {/* market name + badges */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p
          className="min-w-0 flex-1 pr-2 text-sm font-semibold leading-snug text-white/90"
          title={trade.market_name}
          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
        >
          {trade.market_name}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          <OutcomeBadge outcome={trade.outcome} />
          <ConfBadge score={trade.confidence_score} />
        </div>
      </div>

      {/* stats row */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span>
          <span className="font-bold tabular-nums text-white">{currency(trade.amount_bet)}</span>
          <span className="text-mist/45"> stake</span>
        </span>
        <span className="font-mono text-mist/50">{trade.odds_at_bet.toFixed(4)}</span>
        {profit > 0 && (
          <span className="text-success/80">+{currency(profit)} if wins</span>
        )}
        <span className="ml-auto font-mono text-[11px] text-mist/35">{relativeTime(trade.detected_at)}</span>
      </div>

      {/* actions */}
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onManualCopy(trade)}
          className="btn-primary flex-1 rounded-lg border border-paper/25 bg-paper/[0.07] py-2 text-xs font-bold text-paper/90 hover:bg-paper/[0.14] hover:border-paper/40 transition"
        >
          Paper Copy
        </button>
        <button
          onClick={() => onAnalyze(trade)}
          disabled={analyzing}
          className="rounded-lg border border-line/60 bg-transparent px-4 py-2 text-xs font-medium text-mist/60 transition hover:border-neon/30 hover:text-neon/80 active:scale-95 disabled:cursor-wait disabled:opacity-40"
        >
          {analyzing ? "…" : "Analyze"}
        </button>
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-line/40 py-16">
      <div className="relative">
        <div className="absolute -inset-4 rounded-full bg-neon/5 blur-2xl empty-icon" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-neon/15 bg-neon/[0.05]">
          <svg className="h-7 w-7 text-neon/35" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-mist/50">No trades detected yet</p>
        <p className="mt-1.5 max-w-[220px] text-xs text-mist/35">
          Set a target wallet above. The monitor polls every 5 seconds.
        </p>
      </div>
    </div>
  );
}

export default function TradeFeed({ trades, onAnalyze, onManualCopy, analyzingId }: Props) {
  const visible = trades.slice(0, 10);
  const analyzing = Boolean(analyzingId);

  return (
    <Card
      title="Target Trades"
      subtitle="Real trades detected from the monitored wallet."
      badge={trades.length > 0 ? <span className="chip chip-neon ml-1">{trades.length}</span> : null}
    >
      {visible.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {visible.map(trade => (
              <motion.div
                key={trade.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <TradeCard trade={trade} onAnalyze={onAnalyze} onManualCopy={onManualCopy} analyzing={analyzing} />
              </motion.div>
            ))}
          </AnimatePresence>
          {trades.length > 10 && (
            <p className="pt-1 text-center text-xs text-mist/35">Showing 10 of {trades.length}</p>
          )}
        </div>
      )}
    </Card>
  );
}
