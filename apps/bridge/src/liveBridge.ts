import type { BridgeHealthSnapshot } from "@codex-realtime-board/shared";

import { createAppServerClient } from "./appServerClient.js";
import type { AppServerClient } from "./appServerClient.js";
import {
  createBridgeStateStore,
  type BridgeStateStore
} from "./bridgeState.js";
import { createBridgeControlApi, type BridgeControlApi } from "./controlApi.js";
import type {
  AppServerNotificationMessage,
  AppServerThread
} from "./appServerProtocol.js";
import { createSessionRegistry, type SessionRegistry } from "./sessionRegistry.js";
import { createWebSocketTransport } from "./websocketTransport.js";

export interface LiveBridgeRuntimeOptions {
  liveUrl: string;
  cwd: string;
  getBridgeBaseUrl(): string;
  getPanelBaseUrl(): string;
}

export interface LiveBridgeRuntime {
  registry: SessionRegistry;
  controlApi: BridgeControlApi;
  getHealth(): BridgeHealthSnapshot;
  handleNotification(notification: AppServerNotificationMessage): void;
}

export interface LiveBridgeConnection extends LiveBridgeRuntime {
  client: AppServerClient;
  initializeResult: {
    userAgent: string;
    codexHome: string;
    platformFamily: string;
    platformOs: string;
  };
  close(code?: number, reason?: string): void;
}

function getNotificationThreadId(notification: AppServerNotificationMessage): string | null {
  switch (notification.method) {
    case "thread/started":
      return notification.params.thread.id;
    case "thread/status/changed":
    case "turn/started":
    case "turn/completed":
    case "item/started":
    case "item/completed":
    case "thread/tokenUsage/updated":
    case "turn/plan/updated":
    case "thread/compacted":
    case "error":
      return notification.params.threadId;
    case "skills/changed":
      return null;
    default:
      return null;
  }
}

function applyThreadStarted(
  stateStore: BridgeStateStore,
  thread: AppServerThread,
  titleOverride?: string | null
): void {
  stateStore.applyNotification(
    {
      method: "thread/started",
      params: {
        thread: titleOverride
          ? {
              ...thread,
              name: titleOverride,
              preview: titleOverride
            }
          : thread
      }
    },
    new Date(thread.updatedAt || Date.now())
  );
}

export function createLiveBridgeRuntime(
  client: AppServerClient,
  options: LiveBridgeRuntimeOptions
): LiveBridgeRuntime {
  const registry = createSessionRegistry();
  const stateStores = new Map<string, BridgeStateStore>();

  function getOrCreateStore(threadId: string): BridgeStateStore {
    const existing = stateStores.get(threadId);
    if (existing) {
      return existing;
    }

    const store = createBridgeStateStore();
    stateStores.set(threadId, store);
    return store;
  }

  function syncThread(threadId: string): void {
    const store = stateStores.get(threadId);
    if (!store) {
      return;
    }

    registry.upsertState(store.getState());
  }

  function applyToThread(threadId: string, notification: AppServerNotificationMessage): void {
    const store = getOrCreateStore(threadId);
    store.applyNotification(notification);
    syncThread(threadId);
  }

  const controlApi = createBridgeControlApi({
    registry,
    getBridgeBaseUrl: options.getBridgeBaseUrl,
    getPanelBaseUrl: options.getPanelBaseUrl,
    async startSession(request) {
      const started = await client.startThread({
        cwd: request.cwd ?? options.cwd,
        approvalPolicy: "never",
        sandbox: "workspace-write",
        experimentalRawEvents: false,
        persistExtendedHistory: true,
        ephemeral: true
      });

      const store = getOrCreateStore(started.thread.id);
      applyThreadStarted(store, started.thread, request.title ?? null);
      registry.upsertState(store.getState(), { select: true });

      if (request.prompt) {
        const turn = await client.startTurn({
          threadId: started.thread.id,
          input: [
            {
              type: "text",
              text: request.prompt,
              text_elements: []
            }
          ]
        });

        store.applyNotification({
          method: "turn/started",
          params: {
            threadId: started.thread.id,
            turn: turn.turn
          }
        });
        registry.upsertState(store.getState(), { select: true });
      }

      return store.getState();
    }
  });

  return {
    registry,
    controlApi,
    getHealth() {
      return {
        ok: true,
        mode: "live",
        message: `Connected to ${options.liveUrl}`
      };
    },
    handleNotification(notification) {
      const threadId = getNotificationThreadId(notification);
      if (threadId) {
        applyToThread(threadId, notification);
        return;
      }

      if (notification.method === "skills/changed") {
        for (const session of registry.listSessions().active) {
          applyToThread(session.sessionId, notification);
        }

        if (registry.listSessions().active.length === 0) {
          for (const session of registry.listSessions().recent) {
            applyToThread(session.sessionId, notification);
          }
        }
      }
    }
  };
}

export async function connectLiveBridge(
  url: string,
  options: Omit<LiveBridgeRuntimeOptions, "liveUrl">
): Promise<LiveBridgeConnection> {
  const transport = await createWebSocketTransport(url);
  const client = createAppServerClient(transport);
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

  const runtime = createLiveBridgeRuntime(client, {
    ...options,
    liveUrl: url
  });
  client.onNotification((notification) => {
    runtime.handleNotification(notification);
  });

  return {
    ...runtime,
    client,
    initializeResult,
    close(code, reason) {
      client.close(code, reason);
    }
  };
}
