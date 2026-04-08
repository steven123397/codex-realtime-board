import assert from "node:assert/strict";
import test from "node:test";

import type { BoardStateSnapshot, BridgeHealthSnapshot } from "@codex-realtime-board/shared";

import { createBridgeStateStore } from "./bridgeState.js";
import { createBridgeHttpServer } from "./httpServer.js";

test("serves health and state snapshots over HTTP", async () => {
  const store = createBridgeStateStore();
  store.applyNotification(
    {
      method: "thread/tokenUsage/updated",
      params: {
        threadId: "thread_http",
        turnId: "turn_http",
        tokenUsage: {
          total: {
            totalTokens: 2048,
            inputTokens: 1024,
            cachedInputTokens: 0,
            outputTokens: 1024,
            reasoningOutputTokens: 128
          },
          last: {
            totalTokens: 256,
            inputTokens: 128,
            cachedInputTokens: 0,
            outputTokens: 128,
            reasoningOutputTokens: 16
          },
          modelContextWindow: 8192
        }
      }
    },
    new Date("2026-04-08T12:00:00.000Z")
  );

  const server = await createBridgeHttpServer({
    port: 0,
    getHealth: () => ({
      ok: true,
      mode: "live",
      message: "live app-server connected"
    }),
    getState: () => store.getState()
  });

  try {
    const healthResponse = await fetch(`${server.baseUrl}/healthz`);
    assert.equal(healthResponse.status, 200);
    const health = (await healthResponse.json()) as BridgeHealthSnapshot;
    assert.equal(health.mode, "live");

    const stateResponse = await fetch(`${server.baseUrl}/api/state`);
    assert.equal(stateResponse.status, 200);
    const state = (await stateResponse.json()) as BoardStateSnapshot;
    assert.equal(state.session.sessionId, "thread_http");
    assert.equal(state.context.remainingTokens, 6144);
  } finally {
    await server.close();
  }
});
