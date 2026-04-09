import assert from "node:assert/strict";
import test from "node:test";

import type {
  AttachSessionResult,
  BoardStateSnapshot,
  BridgeHealthSnapshot,
  BoardStateSyncResult,
  ManagedSessionListSnapshot,
  StartSessionResult
} from "@codex-realtime-board/shared";

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

test("serves session list, targeted state queries, and control API responses", async () => {
  const defaultState = createBridgeStateStore().getState();
  const requestedState = {
    ...defaultState,
    session: {
      ...defaultState.session,
      sessionId: "thread_requested"
    }
  };
  const sessions: ManagedSessionListSnapshot = {
    active: [
      {
        sessionId: "thread_requested",
        title: "Requested thread",
        status: "running",
        lastActiveAt: "2026-04-09T12:00:00.000Z",
        isManaged: true,
        canResume: true
      }
    ],
    recent: [],
    selectedSessionId: "thread_requested"
  };
  const startResult: StartSessionResult = {
    session: sessions.active[0]!,
    sessions,
    panelUrl: "http://127.0.0.1:5173/?sessionId=thread_requested"
  };
  const attachResult: AttachSessionResult = {
    resolution: "attached",
    session: sessions.active[0]!,
    sessions,
    panelUrl: "http://127.0.0.1:5173/?sessionId=thread_requested"
  };

  const server = await createBridgeHttpServer({
    port: 0,
    getHealth: () => ({
      ok: true,
      mode: "live",
      message: "live app-server connected"
    }),
    getState: (sessionId) => {
      if (!sessionId) {
        return defaultState;
      }

      return sessionId === "thread_requested" ? requestedState : null;
    },
    getStateSync: (sessionId, since) => {
      if (sessionId !== "thread_requested") {
        return null;
      }

      if (since === "cursor_requested_v1") {
        return {
          kind: "unchanged",
          cursor: "cursor_requested_v1"
        };
      }

      return {
        kind: "snapshot",
        cursor: "cursor_requested_v1",
        snapshot: requestedState
      };
    },
    listSessions: () => sessions,
    startSession: async () => startResult,
    attachSession: async () => attachResult
  });

  try {
    const sessionsResponse = await fetch(`${server.baseUrl}/api/sessions`);
    assert.equal(sessionsResponse.status, 200);
    assert.deepEqual((await sessionsResponse.json()) as ManagedSessionListSnapshot, sessions);

    const targetedStateResponse = await fetch(`${server.baseUrl}/api/state?sessionId=thread_requested`);
    assert.equal(targetedStateResponse.status, 200);
    const targetedState = (await targetedStateResponse.json()) as BoardStateSnapshot;
    assert.equal(targetedState.session.sessionId, "thread_requested");

    const syncStateResponse = await fetch(`${server.baseUrl}/api/state/sync?sessionId=thread_requested`);
    assert.equal(syncStateResponse.status, 200);
    const syncState = (await syncStateResponse.json()) as BoardStateSyncResult;
    assert.equal(syncState.kind, "snapshot");
    if (syncState.kind === "snapshot") {
      assert.equal(syncState.cursor, "cursor_requested_v1");
      assert.equal(syncState.snapshot.session.sessionId, "thread_requested");
    }

    const unchangedResponse = await fetch(
      `${server.baseUrl}/api/state/sync?sessionId=thread_requested&since=cursor_requested_v1`
    );
    assert.equal(unchangedResponse.status, 200);
    assert.deepEqual((await unchangedResponse.json()) as BoardStateSyncResult, {
      kind: "unchanged",
      cursor: "cursor_requested_v1"
    });

    const missingStateResponse = await fetch(`${server.baseUrl}/api/state?sessionId=missing`);
    assert.equal(missingStateResponse.status, 404);

    const startResponse = await fetch(`${server.baseUrl}/api/session/start`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        title: "Requested thread"
      })
    });
    assert.equal(startResponse.status, 200);
    assert.deepEqual((await startResponse.json()) as StartSessionResult, startResult);

    const attachResponse = await fetch(`${server.baseUrl}/api/session/attach`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        sessionId: "thread_requested"
      })
    });
    assert.equal(attachResponse.status, 200);
    assert.deepEqual((await attachResponse.json()) as AttachSessionResult, attachResult);
  } finally {
    await server.close();
  }
});
