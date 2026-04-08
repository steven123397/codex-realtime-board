import type { BridgeHealthSnapshot } from "@codex-realtime-board/shared";

import { createBridgeHttpServer } from "./httpServer.js";
import { connectLiveBridge } from "./liveBridge.js";
import { createMockBridgeServer } from "./server.js";

interface RuntimeStateSource {
  getHealth(): BridgeHealthSnapshot;
  getState(): ReturnType<ReturnType<typeof createMockBridgeServer>["getState"]>;
}

function printSnapshot(prefix: string, sessionId: string, phase: string, tool: string | null): void {
  console.log([
    prefix,
    `[bridge] session=${sessionId}`,
    `[bridge] phase=${phase}`,
    `[bridge] tool=${tool ?? "idle"}`
  ].join("\n"));
}

async function keepAlive(): Promise<never> {
  return new Promise(() => {});
}

async function run(): Promise<void> {
  const liveUrl = process.env.CODEX_APP_SERVER_URL;
  const bridgeHost = process.env.CODEX_BRIDGE_HOST ?? "127.0.0.1";
  const bridgePort = Number(process.env.CODEX_BRIDGE_PORT ?? "4317");
  const exitOnCompletion = process.env.CODEX_BRIDGE_EXIT_ON_COMPLETION === "1";

  let source: RuntimeStateSource;

  if (!liveUrl) {
    const mockBridge = createMockBridgeServer();
    source = {
      getHealth: () => mockBridge.getHealth(),
      getState: () => mockBridge.getState()
    };
  } else {
    const liveBridge = await connectLiveBridge(liveUrl);
    const requestedThreadId = process.env.CODEX_THREAD_ID;
    const requestedPrompt = process.env.CODEX_BRIDGE_PROMPT;

    let resolveDone: (() => void) | null = null;
    const done = new Promise<void>((resolve) => {
      resolveDone = resolve;
    });

    liveBridge.client.onNotification((notification) => {
      const snapshot = liveBridge.stateStore.getState();
      console.log(
        [
          `[bridge:event] ${notification.method}`,
          `[bridge] phase=${snapshot.overview.currentPhase}`,
          `[bridge] tool=${snapshot.overview.currentTool ?? "idle"}`,
          `[bridge] session=${snapshot.session.sessionId}`
        ].join("\n")
      );

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
      console.log(`[bridge] resumed thread=${resumed.thread.id}`);
    }

    if (!requestedThreadId && requestedPrompt) {
      const started = await liveBridge.client.startThread({
        cwd: process.cwd(),
        approvalPolicy: "never",
        sandbox: "workspace-write",
        experimentalRawEvents: false,
        persistExtendedHistory: true,
        ephemeral: true
      });
      console.log(`[bridge] started thread=${started.thread.id}`);

      await liveBridge.client.startTurn({
        threadId: started.thread.id,
        input: [
          {
            type: "text",
            text: requestedPrompt,
            text_elements: []
          }
        ]
      });
      console.log("[bridge] turn started");
    }

    if (requestedPrompt && exitOnCompletion) {
      void done.then(() => {
        liveBridge.close(1000, "turn completed");
        process.exit(0);
      });
    }

    source = {
      getHealth: () => ({
        ok: true,
        mode: "live",
        message: `Connected to ${liveUrl}`
      }),
      getState: () => liveBridge.stateStore.getState()
    };
  }

  const httpServer = await createBridgeHttpServer({
    host: bridgeHost,
    port: bridgePort,
    getHealth: () => source.getHealth(),
    getState: () => source.getState()
  });

  const snapshot = source.getState();
  printSnapshot(
    `[bridge] http server ready at ${httpServer.baseUrl}`,
    snapshot.session.sessionId,
    snapshot.overview.currentPhase,
    snapshot.overview.currentTool
  );
  console.log(`[bridge] health endpoint ${httpServer.baseUrl}/healthz`);
  console.log(`[bridge] state endpoint ${httpServer.baseUrl}/api/state`);

  await keepAlive();
}

await run();
