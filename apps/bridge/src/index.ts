import type {
  AttachSessionRequest,
  AttachSessionResult,
  BoardStateSnapshot,
  BoardStateSyncResult,
  BridgeHealthSnapshot,
  ManagedSessionListSnapshot,
  StartSessionRequest,
  StartSessionResult
} from "@codex-realtime-board/shared";

import { createBridgeHttpServer } from "./httpServer.js";
import { connectLiveBridge } from "./liveBridge.js";
import type { AppServerNotificationMessage } from "./appServerProtocol.js";
import { createMockBridgeServer } from "./server.js";

interface RuntimeStateSource {
  getHealth(): BridgeHealthSnapshot;
  getState(sessionId?: string | null): BoardStateSnapshot | null;
  getStateSync(sessionId?: string | null, since?: string | null): BoardStateSyncResult | null;
  listSessions(): ManagedSessionListSnapshot;
  startSession(request: StartSessionRequest): Promise<StartSessionResult>;
  attachSession(request: AttachSessionRequest): Promise<AttachSessionResult>;
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

function printSnapshot(prefix: string, snapshot: BoardStateSnapshot | null): void {
  if (!snapshot) {
    console.log([prefix, "[bridge] waiting for a managed session"].join("\n"));
    return;
  }

  console.log(
    [
      prefix,
      `[bridge] session=${snapshot.session.sessionId}`,
      `[bridge] phase=${snapshot.overview.currentPhase}`,
      `[bridge] tool=${snapshot.overview.currentTool ?? "idle"}`
    ].join("\n")
  );
}

async function keepAlive(): Promise<never> {
  return new Promise(() => {});
}

async function run(): Promise<void> {
  const liveUrl = process.env.CODEX_APP_SERVER_URL;
  const bridgeHost = process.env.CODEX_BRIDGE_HOST ?? "127.0.0.1";
  const bridgePort = Number(process.env.CODEX_BRIDGE_PORT ?? "4317");
  const panelBaseUrl = process.env.CODEX_BOARD_PANEL_URL ?? "http://127.0.0.1:5173";
  const exitOnCompletion = process.env.CODEX_BRIDGE_EXIT_ON_COMPLETION === "1";

  let source: RuntimeStateSource;
  let currentBridgeBaseUrl = `http://${bridgeHost}:${bridgePort}`;

  if (!liveUrl) {
    const mockBridge = createMockBridgeServer();
    source = {
      getHealth: () => mockBridge.getHealth(),
      getState: (sessionId) => mockBridge.getState(sessionId),
      getStateSync: (sessionId, since) => mockBridge.getStateSync(sessionId, since),
      listSessions: () => mockBridge.listSessions(),
      startSession: (request) => mockBridge.startSession(request),
      attachSession: (request) => mockBridge.attachSession(request)
    };
  } else {
    const liveBridge = await connectLiveBridge(liveUrl, {
      cwd: process.cwd(),
      getBridgeBaseUrl: () => currentBridgeBaseUrl,
      getPanelBaseUrl: () => panelBaseUrl
    });
    const requestedThreadId = process.env.CODEX_THREAD_ID;
    const requestedPrompt = process.env.CODEX_BRIDGE_PROMPT;

    let resolveDone: (() => void) | null = null;
    const done = new Promise<void>((resolve) => {
      resolveDone = resolve;
    });

    liveBridge.client.onNotification((notification) => {
      const snapshot = liveBridge.controlApi.getState(getNotificationThreadId(notification));
      printSnapshot(`[bridge:event] ${notification.method}`, snapshot);

      if ((notification.method === "turn/completed" || notification.method === "error") && resolveDone) {
        resolveDone();
        resolveDone = null;
      }
    });

    if (requestedThreadId) {
      const resumed = await liveBridge.client.resumeThread({
        threadId: requestedThreadId,
        persistExtendedHistory: true
      });
      liveBridge.handleNotification({
        method: "thread/started",
        params: {
          thread: resumed.thread
        }
      });
      await liveBridge.controlApi.attachSession({
        sessionId: resumed.thread.id
      });
      console.log(`[bridge] resumed thread=${resumed.thread.id}`);
    }

    if (!requestedThreadId && requestedPrompt) {
      const started = await liveBridge.controlApi.startSession({
        cwd: process.cwd(),
        prompt: requestedPrompt
      });
      console.log(`[bridge] started thread=${started.session.sessionId}`);
    }

    if (requestedPrompt && exitOnCompletion) {
      void done.then(() => {
        liveBridge.close(1000, "turn completed");
        process.exit(0);
      });
    }

    source = {
      getHealth: () => liveBridge.getHealth(),
      getState: (sessionId) => liveBridge.controlApi.getState(sessionId),
      getStateSync: (sessionId, since) => liveBridge.controlApi.getStateSync(sessionId, since),
      listSessions: () => liveBridge.controlApi.listSessions(),
      startSession: (request) => liveBridge.controlApi.startSession(request),
      attachSession: (request) => liveBridge.controlApi.attachSession(request)
    };
  }

  const httpServer = await createBridgeHttpServer({
    host: bridgeHost,
    port: bridgePort,
    getHealth: () => source.getHealth(),
    getState: (sessionId) => source.getState(sessionId),
    getStateSync: (sessionId, since) => source.getStateSync(sessionId, since),
    listSessions: () => source.listSessions(),
    startSession: (request) => source.startSession(request),
    attachSession: (request) => source.attachSession(request)
  });
  currentBridgeBaseUrl = httpServer.baseUrl;

  printSnapshot(`[bridge] http server ready at ${httpServer.baseUrl}`, source.getState());
  console.log(`[bridge] health endpoint ${httpServer.baseUrl}/healthz`);
  console.log(`[bridge] sessions endpoint ${httpServer.baseUrl}/api/sessions`);
  console.log(`[bridge] state endpoint ${httpServer.baseUrl}/api/state`);
  console.log(`[bridge] sync endpoint ${httpServer.baseUrl}/api/state/sync`);

  await keepAlive();
}

await run();
