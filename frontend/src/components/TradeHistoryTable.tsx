import { useMemo, useState } from "react";
import Card from "./Card";
import type { MyTrade } from "../types";
import { currency, relativeTime, shortHash, potentialProfit } from "../lib/format";

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string; dot?: boolean }> = {
    PAPER:             { cls: "chip-paper",   label: "Paper",        dot: true },
    CONFIRMED:         { cls: "chip-success", label: "Confirmed",    dot: true },
    FAILED:            { cls: "chip-rose",    label: "Failed" },
    PENDING:           { cls: "chip-amber",   label: "Pending",      dot: true },
    PENDING_SIGNATURE: { cls: "chip-amber",   label: "Awaiting sig", dot: true },
  };
  const cfg = map[status] ?? { cls: "chip-mist", label: status };
  return (
    <span className={`chip ${cfg.cls}`}>
      {cfg.dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {cfg.label}
    </span>
  );
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  return <span className={outcome === "YES" ? "badge-yes" : "badge-no"}>{outcome}</span>;
}

function PnlCell({ trade }: { trade: MyTrade }) {
  if (trade.profit_loss !== null && trade.profit_loss !== 0) {
    const pos = trade.profit_loss > 0;
    return (
      <span className={`font-black tabular-nums ${pos ? "gradient-text-success" : "gradient-text-rose"}`}>
        {pos ? "+" : ""}{currency(trade.profit_loss)}
      </span>
    );
  }
  if (trade.status === "PAPER" && trade.result === null) {
    const est = potentialProfit(trade.amount_bet, trade.odds_at_bet);
    return <span className="text-mist/45 tabular-nums text-xs">+{currency(est)} est.</span>;
  }
  return <span className="text-mist/35">—</span>;
}

export default function TradeHistoryTable({ trades }: { trades: MyTrade[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");

  const filtered = useMemo(
    () => trades.filter(t => {
      const matchQ = t.market_name.toLowerCase().includes(query.toLowerCase());
      const matchS = status === "ALL" || t.status === status;
      return matchQ && matchS;
    }),
    [query, status, trades],
  );

  return (
    <Card
      title="Paper Trade History"
      badge={trades.length > 0 ? <span className="chip chip-paper ml-1">{trades.length}</span> : null}
      subtitle="All simulated copy trades. P&L shows estimated if unresolved."
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Filter by market…"
          className="input-premium flex-1 px-3.5 py-2 text-sm"
        />
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="input-premium px-3.5 py-2 text-sm"
        >
          <option value="ALL">All statuses</option>
          <option value="PAPER">Paper</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PENDING">Pending</option>
          <option value="PENDING_SIGNATURE">Awaiting sig</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState hasFilter={query !== "" || status !== "ALL"} />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="border-b border-line/50">
                {["Market","Side","Stake","Odds","P&L","Status","Ref","Time"].map(h => (
                  <th key={h} className="pb-3 pr-3 font-semibold text-mist/45 last:pr-0">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(trade => (
                <tr key={trade.id} className="table-row-hover border-b border-line/25 transition last:border-0">
                  <td className="max-w-[160px] truncate py-3 pr-3 text-sm font-semibold text-white/85" title={trade.market_name}>
                    {trade.market_name}
                  </td>
                  <td className="py-3 pr-3"><OutcomeBadge outcome={trade.outcome} /></td>
                  <td className="py-3 pr-3 tabular-nums text-white/80">{currency(trade.amount_bet)}</td>
                  <td className="py-3 pr-3 font-mono text-mist/55">{trade.odds_at_bet.toFixed(4)}</td>
                  <td className="py-3 pr-3"><PnlCell trade={trade} /></td>
                  <td className="py-3 pr-3"><StatusChip status={trade.status} /></td>
                  <td className="py-3 pr-3 font-mono text-[11px] text-mist/45">
                    {trade.transaction_hash?.startsWith("paper_")
                      ? <span className="text-paper/55">{trade.transaction_hash}</span>
                      : shortHash(trade.transaction_hash)}
                  </td>
                  <td className="py-3 text-mist/40">{relativeTime(trade.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-line/40 py-10">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-line/50 bg-surface/60 empty-icon">
        <svg className="h-5 w-5 text-mist/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" strokeLinecap="round" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-mist/50">
          {hasFilter ? "No trades match the filter" : "No copy trades yet"}
        </p>
        <p className="mt-1.5 max-w-xs text-center text-xs text-mist/35">
          {hasFilter
            ? "Try clearing the search or selecting All statuses."
            : "Enable auto-copy or click Paper Copy on a detected trade."}
        </p>
      </div>
    </div>
  );
}
