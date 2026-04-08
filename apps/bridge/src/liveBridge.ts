import { createAppServerClient } from "./appServerClient.js";
import type { AppServerClient } from "./appServerClient.js";
import { createBridgeStateStore, type BridgeStateStore } from "./bridgeState.js";
import { createWebSocketTransport } from "./websocketTransport.js";

export interface LiveBridgeConnection {
  client: AppServerClient;
  stateStore: BridgeStateStore;
  initializeResult: {
    userAgent: string;
    codexHome: string;
    platformFamily: string;
    platformOs: string;
  };
  close(code?: number, reason?: string): void;
}

export async function connectLiveBridge(url: string): Promise<LiveBridgeConnection> {
  const transport = await createWebSocketTransport(url);
  const client = createAppServerClient(transport);
  const stateStore = createBridgeStateStore();
  client.onNotification((notification) => {
    stateStore.applyNotification(notification);
  });

  const initializeResult = await client.initialize(
    {
      name: "codex-realtime-board-bridge",
      version: "0.0.0"
    },
    {
      experimentalApi: true,
      optOutNotificationMethods: []
    }
  );

  return {
    client,
    stateStore,
    initializeResult,
    close(code, reason) {
      client.close(code, reason);
    }
  };
}
