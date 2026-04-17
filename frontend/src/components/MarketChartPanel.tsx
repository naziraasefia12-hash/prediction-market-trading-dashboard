import { useEffect, useRef, useState } from "react";
import { AreaSeries, ColorType, createChart } from "lightweight-charts";
import Card from "./Card";
import type { MarketAnalysis } from "../types";
import { currency, percent } from "../lib/format";
import clsx from "clsx";

type Props = { analysis: MarketAnalysis | null; loading?: boolean; error?: string | null };

function StatTile({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  const valueColor =
    positive === true  ? "text-success glow-success" :
    positive === false ? "text-rose glow-rose" :
    "text-white";

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-white/[0.05] bg-surface/60 px-3.5 py-3 transition hover:border-white/[0.09]">
      <span className="section-title">{label}</span>
      <span className={clsx("text-lg font-black tabular-nums leading-none", valueColor)}>{value}</span>
    </div>
  );
}

function AnalysisSkeleton() {
  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="skeleton h-4 w-20 rounded-full" />
        <div className="skeleton h-4 flex-1 rounded-lg" />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
      </div>
      <div className="skeleton h-56 rounded-xl" />
      <div className="skeleton h-16 rounded-xl" />
    </div>
  );
}

function AnalysisChart({ data }: { data: { time: number; value: number }[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#64748b", attributionLogo: false },
      grid: { vertLines: { color: "rgba(28,28,48,0.8)" }, horzLines: { color: "rgba(28,28,48,0.8)" } },
      rightPriceScale: { borderColor: "#1c1c30", scaleMargins: { top: 0.1, bottom: 0.1 } },
      timeScale: { borderColor: "#1c1c30", timeVisible: true },
      crosshair: { mode: 1 },
      width: el.clientWidth,
      height: 220,
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: "#22d3ee",
      topColor: "rgba(34,211,238,0.22)",
      bottomColor: "rgba(34,211,238,0.01)",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    if (data.length > 0) {
      try {
        series.setData(data as Parameters<typeof series.setData>[0]);
        chart.timeScale().fitContent();
      } catch { /* malformed data */ }
    }

    const ro = new ResizeObserver(() => chart.applyOptions({ width: el.clientWidth }));
    ro.observe(el);
    setReady(true);
    return () => { ro.disconnect(); chart.remove(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-white/[0.05]">
      <div ref={containerRef} className={clsx("w-full transition-opacity duration-500", ready ? "opacity-100" : "opacity-0")} />
      {!ready && <div className="skeleton absolute inset-0 rounded-xl" />}
    </div>
  );
}

export default function MarketChartPanel({ analysis, loading = false, error = null }: Props) {
  const oddsHistory: { time: number; value: number }[] = Array.isArray(analysis?.odds_history)
    ? (analysis!.odds_history as { time: number; value: number }[])
    : [];

  return (
    <Card title="Market Analysis">
      {loading && <AnalysisSkeleton />}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-rose/20 bg-rose/[0.04] py-12 px-6 animate-fade-in">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-rose/20 bg-rose/[0.06]">
            <svg className="h-6 w-6 text-rose/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <p className="text-sm font-bold text-rose/75">Analysis failed</p>
          <p className="max-w-xs text-center text-xs text-mist/55">{error}</p>
        </div>
      )}

      {!loading && !error && !analysis && (
        <div className="relative overflow-hidden flex flex-col items-center justify-center gap-5 rounded-xl border border-dashed border-line/50 py-16 animate-fade-in">
          {/* ambient glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-paper/[0.04] via-transparent to-neon/[0.03] pointer-events-none" />
          <div className="relative flex flex-col items-center gap-4">
            <div className="relative">
              <div className="absolute -inset-5 rounded-full bg-paper/8 blur-2xl empty-icon" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-paper/20 bg-paper/[0.06]">
                <svg className="h-7 w-7 text-paper/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-mist/55">Select a market to analyze</p>
              <p className="mt-1.5 max-w-[200px] text-xs text-mist/35">
                Click <span className="text-paper/70 font-semibold">Analyze</span> on any trade to load scoring and price data.
              </p>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && analysis && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold text-white/90 leading-snug flex-1 min-w-0 truncate" title={analysis.market_name}>
              {analysis.market_name}
            </p>
            <span className="chip chip-neon shrink-0">Live</span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile label="Entry Odds"   value={analysis.current_odds.toFixed(4)} />
            <StatTile label="Implied Prob" value={percent(analysis.implied_probability)}   positive={analysis.implied_probability >= 50} />
            <StatTile label="Liquidity"    value={currency(analysis.liquidity)} />
            <StatTile label="Confidence"   value={percent(analysis.confidence_score)}       positive={analysis.confidence_score >= 60} />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <StatTile label="Est. Win Prob" value={percent(analysis.estimated_win_probability)} positive={analysis.estimated_win_probability >= 50} />
            <StatTile label="24h Volume"    value={currency(analysis.volume_24h)} />
            <StatTile label="Time Left"     value={
              analysis.time_remaining_hours != null
                ? analysis.time_remaining_hours < 24
                  ? `${analysis.time_remaining_hours.toFixed(1)}h`
                  : `${(analysis.time_remaining_hours / 24).toFixed(1)}d`
                : "Unknown"
            } />
          </div>

          {oddsHistory.length > 0 ? (
            <AnalysisChart data={oddsHistory} />
          ) : (
            <div className="rounded-xl border border-dashed border-line/40 py-4 text-center">
              <p className="text-xs text-mist/40">No price history available for this market.</p>
            </div>
          )}

          <div className="rounded-xl border border-line/40 bg-surface/50 px-4 py-3">
            <p className="mb-1.5 section-title">Analysis</p>
            <p className="text-xs leading-relaxed text-mist/65">{analysis.reasoning}</p>
          </div>
        </div>
      )}
    </Card>
  );
}
