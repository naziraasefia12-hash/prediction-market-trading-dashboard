import { BrowserProvider, Eip1193Provider } from "ethers";
import api from "./client";
import type {
  AlertItem,
  BalanceSnapshot,
  CopyIntent,
  MarketAnalysis,
  MyTrade,
  PerformanceSnapshot,
  TargetTrade,
  UserSettings,
} from "../types";

export const requestWalletNonce = async (walletAddress: string) => {
  const { data } = await api.post("/api/connect-wallet", { wallet_address: walletAddress });
  return data as { wallet_address: string; nonce: string; message: string };
};

export const verifyWalletSession = async (
  walletAddress: string,
  nonce: string,
  message: string,
  signature: string,
) => {
  const { data } = await api.post("/api/connect-wallet/verify", {
    wallet_address: walletAddress,
    nonce,
    message,
    signature,
  });
  localStorage.setItem("pmct.session", data.token);
  return data as { token: string; wallet_address: string; expires_in_seconds: number };
};

export const connectAndSign = async (ethereum: Eip1193Provider) => {
  const provider = new BrowserProvider(ethereum);
  const signer = await provider.getSigner();
  const walletAddress = await signer.getAddress();
  const challenge = await requestWalletNonce(walletAddress);
  const signature = await signer.signMessage(challenge.message);
  return verifyWalletSession(walletAddress, challenge.nonce, challenge.message, signature);
};

export const fetchSettings = async () => (await api.get<UserSettings>("/api/settings")).data;
export const setTargetUser = async (targetUser: string) =>
  (await api.post<UserSettings>("/api/set-target-user", { target_user: targetUser })).data;
export const updateSettings = async (payload: {
  max_bet_amount: number;
  auto_copy_enabled: boolean;
  copy_delay_seconds: number;
  min_confidence_score: number;
}) => (await api.post<UserSettings>("/api/update-settings", payload)).data;
export const fetchTargetTrades = async () => (await api.get<TargetTrade[]>("/api/target-trades")).data;
export const fetchMyTrades = async () => (await api.get<MyTrade[]>("/api/my-trades")).data;
export const fetchPerformance = async () => (await api.get<PerformanceSnapshot>("/api/performance")).data;
export const fetchBalance = async () => (await api.get<BalanceSnapshot>("/api/balance")).data;
export const fetchAlerts = async () => (await api.get<AlertItem[]>("/api/alerts")).data;
export const fetchMarketAnalysis = async (marketSlug: string) =>
  (await api.get<MarketAnalysis>("/api/analyze-market", { params: { market_slug: marketSlug } })).data;
export const manualCopyTrade = async (targetTradeId: number) =>
  (await api.post<{ trade: MyTrade; execution_payload: CopyIntent }>("/api/manual-copy-trade", { target_trade_id: targetTradeId })).data;
export const confirmCopyTrade = async (myTradeId: number, transactionHash: string, status: string) =>
  (await api.post<MyTrade>("/api/confirm-copy", { my_trade_id: myTradeId, transaction_hash: transactionHash, status })).data;

