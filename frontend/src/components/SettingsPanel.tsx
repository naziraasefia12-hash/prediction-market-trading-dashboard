import { useEffect, useState } from "react";
import Card from "./Card";
import type { BalanceSnapshot, UserSettings } from "../types";
import { currency } from "../lib/format";

type SavePayload = {
  max_bet_amount: number; auto_copy_enabled: boolean;
  copy_delay_seconds: number; min_confidence_score: number;
};
type Props = { settings: UserSettings; balance: BalanceSnapshot | null; onSave: (p: SavePayload) => Promise<void> };

export default function SettingsPanel({ settings, balance, onSave }: Props) {
  const [form, setForm] = useState<SavePayload>({
    max_bet_amount: settings.max_bet_amount, auto_copy_enabled: settings.auto_copy_enabled,
    copy_delay_seconds: settings.copy_delay_seconds, min_confidence_score: settings.min_confidence_score,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      max_bet_amount: settings.max_bet_amount, auto_copy_enabled: settings.auto_copy_enabled,
      copy_delay_seconds: settings.copy_delay_seconds, min_confidence_score: settings.min_confidence_score,
    });
  }, [settings]);

  const set = (patch: Partial<SavePayload>) => setForm(f => ({ ...f, ...patch }));
  const handleSave = async () => { setSaving(true); try { await onSave(form); } finally { setSaving(false); } };

  const balanceVal = balance?.usdc_balance ?? 0;

  return (
    <Card title="Settings" badge={<span className="chip chip-paper ml-1">Paper</span>}>
      {/* balance + auto-copy row */}
      <div className="mb-4 grid grid-cols-2 gap-2.5">
        {/* balance tile */}
        <div className="glass-card p-3.5">
          <p className="section-title">Paper Balance</p>
          <p className={`mt-2 text-2xl font-black tabular-nums ${balanceVal > 0 ? "gradient-text-paper" : "text-mist/50"}`}>
            {currency(balanceVal)}
          </p>
        </div>

        {/* auto-copy toggle */}
        <button
          onClick={() => set({ auto_copy_enabled: !form.auto_copy_enabled })}
          className={`glass-card flex flex-col items-start p-3.5 text-left transition-all duration-300 ${
            form.auto_copy_enabled ? "border-neon/20 bg-neon/[0.04]" : ""
          }`}
        >
          <p className="section-title">Auto-Copy</p>
          <div className="mt-2 flex items-center gap-2.5">
            {form.auto_copy_enabled ? (
              <>
                <div className="pulse-ring-wrap">
                  <div className="h-2.5 w-2.5 rounded-full bg-neon pulse-dot" />
                </div>
                <span className="text-sm font-black text-neon">Enabled</span>
              </>
            ) : (
              <>
                <div className="h-2.5 w-2.5 rounded-full bg-line" />
                <span className="text-sm font-bold text-mist/45">Disabled</span>
              </>
            )}
          </div>
        </button>
      </div>

      {/* sliders */}
      <div className="space-y-4">
        <Slider
          label="Max Bet / Trade" display={currency(form.max_bet_amount)}
          min={5} max={500} step={5} value={form.max_bet_amount} accentClass="accent-neon"
          onChange={v => set({ max_bet_amount: v })}
        />
        <Slider
          label="Min Confidence" display={`${form.min_confidence_score}%`}
          min={0} max={100} step={5} value={form.min_confidence_score} accentClass="accent-amber"
          onChange={v => set({ min_confidence_score: v })}
        />
        <Slider
          label="Copy Delay" display={form.copy_delay_seconds === 0 ? "instant" : `${form.copy_delay_seconds}s`}
          min={0} max={30} step={1} value={form.copy_delay_seconds} accentClass="accent-paper"
          onChange={v => set({ copy_delay_seconds: v })}
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary mt-5 w-full rounded-xl border border-neon/20 bg-neon/[0.07] py-2.5 text-sm font-bold text-neon hover:bg-neon/[0.13] hover:border-neon/35 transition disabled:opacity-40"
      >
        {saving ? "Saving…" : "Save Settings"}
      </button>
    </Card>
  );
}

function Slider({ label, display, min, max, step, value, accentClass, onChange }: {
  label: string; display: string; min: number; max: number;
  step: number; value: number; accentClass: string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-mist/55">{label}</span>
        <span className="font-mono text-xs font-bold text-white/80">{display}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className={`w-full ${accentClass}`}
      />
    </div>
  );
}
