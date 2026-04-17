import { AnimatePresence, motion } from "framer-motion";
import Card from "./Card";
import type { AlertItem } from "../types";
import { relativeTime } from "../lib/format";

const ALERT_STYLE: Record<string, { border: string; bg: string; text: string; icon: string }> = {
  warning: { border: "border-amber/20", bg: "bg-amber/[0.05]",   text: "text-amber/85",   icon: "⚠" },
  error:   { border: "border-rose/20",  bg: "bg-rose/[0.05]",    text: "text-rose/85",    icon: "✕" },
  info:    { border: "border-neon/20",  bg: "bg-neon/[0.05]",    text: "text-neon/85",    icon: "ℹ" },
};

export default function AlertsPanel({ alerts }: { alerts: AlertItem[] }) {
  return (
    <Card
      title="Alerts"
      badge={alerts.length > 0 ? <span className="chip chip-amber ml-1">{alerts.length}</span> : null}
    >
      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-line/40 py-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-success/20 bg-success/[0.06]">
            <svg className="h-5 w-5 text-success/50 empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-mist/50">All clear</p>
            <p className="mt-1 text-xs text-mist/35">Balance warnings and copy errors appear here.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {alerts.map((alert, i) => {
              const s = ALERT_STYLE[alert.type] ?? { border: "border-line/40", bg: "bg-surface/50", text: "text-mist", icon: "•" };
              return (
                <motion.div
                  key={`${alert.title}-${i}`}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={`rounded-xl border px-4 py-3 ${s.border} ${s.bg}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <span className={`mt-0.5 text-sm ${s.text}`}>{s.icon}</span>
                      <div>
                        <p className={`text-sm font-bold ${s.text}`}>{alert.title}</p>
                        <p className="mt-0.5 text-xs text-mist/55">{alert.message}</p>
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-mist/40">{relativeTime(alert.created_at)}</span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </Card>
  );
}
