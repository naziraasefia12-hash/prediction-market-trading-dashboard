import { useEffect } from "react";
import type { SocketMessage } from "../types";

export function useTradeSocket(onMessage: (message: SocketMessage) => void) {
  useEffect(() => {
    const endpoint = import.meta.env.VITE_WS_URL ?? "ws://localhost:8000/ws/trades";
    const socket = new WebSocket(endpoint);

    socket.onmessage = (event) => {
      try {
        onMessage(JSON.parse(event.data) as SocketMessage);
      } catch {
        // Ignore malformed payloads to keep the dashboard responsive.
      }
    };

    return () => socket.close();
  }, [onMessage]);
}
