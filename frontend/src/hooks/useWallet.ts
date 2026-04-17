import { useState } from "react";
import { Eip1193Provider } from "ethers";
import { connectAndSign } from "../api/trading";

type WalletState = {
  address: string | null;
  connected: boolean;
  connecting: boolean;
  error: string | null;
};

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    connected: false,
    connecting: false,
    error: null,
  });

  const connect = async () => {
    if (!window.ethereum) {
      setState((current) => ({ ...current, error: "MetaMask not detected in this browser." }));
      return null;
    }
    setState((current) => ({ ...current, connecting: true, error: null }));
    try {
      const session = await connectAndSign(window.ethereum);
      setState({
        address: session.wallet_address,
        connected: true,
        connecting: false,
        error: null,
      });
      return session.wallet_address;
    } catch (error) {
      setState({
        address: null,
        connected: false,
        connecting: false,
        error: error instanceof Error ? error.message : "Wallet connection failed",
      });
      return null;
    }
  };

  return { ...state, connect };
}
