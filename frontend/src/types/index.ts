export type UserSettings = {
  id: number;
  wallet_address: string;
  target_user: string | null;
  max_bet_amount: number;
  auto_copy_enabled: boolean;
  copy_delay_seconds: number;
  min_confidence_score: number;
  created_at: string;
  updated_at: string | null;
};

export type TargetTrade = {
  id: number;
  polymarket_trade_id: string;
  market_id: string | null;
  market_name: string;
  outcome: "YES" | "NO";
  amount_bet: number;
  odds_at_bet: number;
  confidence_score: number;
  reasoning: string | null;
  detected_at: string;
  market_resolved: boolean;
  market_result: string | null;
};

export type MyTrade = {
  id: number;
  target_trade_id: number | null;
  market_name: string;
  outcome: "YES" | "NO";
  amount_bet: number;
  odds_at_bet: number;
  transaction_hash: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
  result: string | null;
  profit_loss: number | null;
};

export type PerformanceSnapshot = {
  win_rate: number;
  total_profit_loss: number;
  average_odds: number;
  roi: number;
  biggest_win: number;
  biggest_loss: number;
  total_trades: number;
  winning_trades: number;
  pending_trades: number;
  paper_trades: number;
  total_staked: number;
};

export type BalanceSnapshot = {
  wallet_address: string;
  usdc_balance: number;
  low_balance: boolean;
};

export type AlertItem = {
  type: string;
  title: string;
  message: string;
  created_at: string;
};

export type MarketAnalysis = {
  market_id: string | null;
  market_name: string;
  current_odds: number;
  implied_probability: number;
  estimated_win_probability: number;
  confidence_score: number;
  liquidity: number;
  volume_24h: number;
  time_remaining_hours: number | null;
  reasoning: string;
  odds_history: { time: number; value: number }[];
};

export type CopyIntent = {
  my_trade_id: number;
  market_name: string;
  outcome: "YES" | "NO";
  amount_bet: number;
  odds_at_bet: number;
  execution_mode: string;
};

export type SocketMessage =
  | { type: "target_trade_detected"; trade: Partial<TargetTrade> }
  | { type: "copy_intent_created"; wallet_address: string; copy_intent: CopyIntent }
  | { type: "low_balance_warning"; wallet_address: string; balance: number };
