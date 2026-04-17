import Card from "./Card";
import type { PerformanceSnapshot } from "../types";
import { currency, percent } from "../lib/format";

type StatColor = "white" | "neon" | "rose" | "amber" | "paper" | "mist" | "success";

const VALUE_CLS: Record<StatColor, string> = {
  white:   "text-white",
  neon:    "text-neon    glow-neon",
  rose:    "gradient-text-rose",
  amber:   "text-amber   glow-amber",
  paper:   "gradient-text-paper",
  success: "gradient-text-success",
  mist:    "text-mist/60",
};

function Stat({
  label, value, sub, size = "normal", color = "white", tint,
}: {
  label: string; value: string; sub?: string;
  size?: "normal" | "large"; color?: StatColor;
  tint?: "success" | "rose" | "neon" | "paper";
}) {
  const tintMap = {
    success: "from-success/[0.06] to-transparent",
    rose:    "from-rose/[0.06]    to-transparent",
    neon:    "from-neon/[0.05]    to-transparent",
    paper:   "from-paper/[0.06]   to-transparent",
  };
  return (
    <div className={`stat-card${size === "large" ? " stat-card-hero" : ""}`}>
      {tint && <div className={`absolute inset-0 rounded-[0.875rem] bg-gradient-to-br ${tintMap[tint]} pointer-events-none`} />}
      <p className="section-title relative z-10">{label}</p>
      <p className={`relative z-10 font-black tabular-nums leading-none ${VALUE_CLS[color]} ${size === "large" ? "text-4xl" : "text-2xl"}`}>
        {value}
      </p>
      {sub && <p className="relative z-10 text-[11px] text-mist/45">{sub}</p>}
    </div>
  );
}

export default function PerformanceGrid({ performance: p }: { performance: PerformanceSnapshot }) {
  const pnlPos   = p.total_profit_loss > 0;
  const pnlColor: StatColor = p.total_profit_loss !== 0 ? (pnlPos ? "success" : "rose") : "mist";
  const roiColor: StatColor = p.roi !== 0 ? (p.roi > 0 ? "success" : "rose") : "mist";
  const hasResolved = p.total_trades - p.paper_trades > 0 || p.winning_trades > 0;

  return (
    <Card
      title="Paper Performance"
      badge={<span className="chip chip-paper ml-1">Simulated</span>}
      subtitle="All values are simulated — no real USDC at risk."
    >
      {/* Primary row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Paper Trades"
          value={String(p.paper_trades)}
          sub={`${p.total_trades} total`}
          color="neon"
          size="large"
          tint="neon"
        />
        <Stat
          label="Total Staked"
          value={currency(p.total_staked)}
          sub="Simulated USDC"
          size="large"
        />
        <Stat
          label="Total P&L"
          value={(pnlPos ? "+" : "") + currency(p.total_profit_loss)}
          sub={`ROI ${percent(p.roi)}`}
          color={pnlColor}
          size="large"
          tint={p.total_profit_loss !== 0 ? (pnlPos ? "success" : "rose") : undefined}
        />
        <Stat
          label="Return on Investment"
          value={percent(p.roi)}
          sub={hasResolved ? `${p.winning_trades} wins` : "No resolved trades"}
          color={roiColor}
          size="large"
          tint={p.roi !== 0 ? (p.roi > 0 ? "success" : "rose") : undefined}
        />
      </div>

      {/* Divider */}
      <div className="my-4 h-px w-full bg-gradient-to-r from-transparent via-line/80 to-transparent" />

      {/* Secondary row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Win Rate"
          value={percent(p.win_rate)}
          sub={hasResolved ? `${p.winning_trades} / ${p.total_trades}` : "Awaiting resolution"}
          color={p.win_rate >= 50 && hasResolved ? "success" : "mist"}
        />
        <Stat
          label="Avg Entry Odds"
          value={p.average_odds > 0 ? p.average_odds.toFixed(4) : "—"}
          sub="Price at open"
        />
        <Stat
          label="Best Win"
          value={p.biggest_win > 0 ? "+" + currency(p.biggest_win) : "—"}
          color={p.biggest_win > 0 ? "success" : "mist"}
        />
        <Stat
          label="Worst Loss"
          value={p.biggest_loss < 0 ? currency(p.biggest_loss) : "—"}
          color={p.biggest_loss < 0 ? "rose" : "mist"}
        />
      </div>
    </Card>
  );
}
