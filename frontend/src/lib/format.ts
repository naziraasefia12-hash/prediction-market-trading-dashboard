export const currency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

export const percent = (value: number) => `${value.toFixed(1)}%`;

export const shortHash = (value: string | null | undefined) =>
  value ? `${value.slice(0, 8)}…${value.slice(-4)}` : "—";

export const shortAddress = (value: string | null | undefined) =>
  value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "—";

export const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export const relativeTime = (value: string): string => {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
};

/** Estimated profit if the position wins (Polymarket price = probability). */
export const potentialProfit = (amount: number, odds: number): number => {
  if (odds <= 0 || odds >= 1) return 0;
  return Math.round((amount * (1 - odds)) / odds * 100) / 100;
};

export const confidenceClass = (score: number): string => {
  if (score >= 70) return "chip-neon";
  if (score >= 50) return "chip-amber";
  return "chip-rose";
};
