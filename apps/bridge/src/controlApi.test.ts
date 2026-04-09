import assert from "node:assert/strict";
import test from "node:test";

import type { BoardStateSnapshot, SessionStatus, StartSessionRequest } from "@codex-realtime-board/shared";

import { createEmptyBridgeState } from "./bridgeState.js";
import { createBridgeControlApi } from "./controlApi.js";
import { createSessionRegistry } from "./sessionRegistry.js";

function createSnapshot(
  sessionId: string,
  status: SessionStatus,
  lastActiveAt: string,
  title: string = sessionId
): BoardStateSnapshot {
  const snapshot = createEmptyBridgeState();
  snapshot.session = {
    sessionId,
    title,
    status,
    lastActiveAt,
    isManaged: true
  };

  return snapshot;
}

function createControlApi(startSessionImpl?: (request: StartSessionRequest) => Promise<BoardStateSnapshot>) {
  const registry = createSessionRegistry();
  const api = createBridgeControlApi({
    registry,
    getBridgeBaseUrl: () => "http://127.0.0.1:4317",
    getPanelBaseUrl: () => "http://127.0.0.1:5173",
    startSession: async (request) =>
      startSessionImpl?.(request) ??
      createSnapshot("session_started", "running", "2026-04-09T12:00:00.000Z", request.title ?? "Started session")
  });

  return { api, registry };
}

test("auto attaches when exactly one active managed session exists", async () => {
  const { api, registry } = createControlApi();
  registry.upsertState(createSnapshot("session_active", "running", "2026-04-09T10:30:00.000Z"));

  const result = await api.attachSession({});

  assert.equal(result.resolution, "attached");
  assert.equal(result.session?.sessionId, "session_active");
  assert.equal(
    result.panelUrl,
    "http://127.0.0.1:5173/?sessionId=session_active&bridgeUrl=http%3A%2F%2F127.0.0.1%3A4317"
  );
  assert.equal(result.sessions.selectedSessionId, "session_active");
});

test("returns selection-required when multiple active sessions exist without an explicit target", async () => {
  const { api, registry } = createControlApi();
  registry.upsertState(createSnapshot("session_a", "running", "2026-04-09T10:30:00.000Z"));
  registry.upsertState(createSnapshot("session_b", "running", "2026-04-09T10:20:00.000Z"));

  const result = await api.attachSession({});

  assert.equal(result.resolution, "selection-required");
  assert.equal(result.session, null);
  assert.equal(result.panelUrl, null);
  assert.deepEqual(
    result.sessions.active.map((session) => session.sessionId),
    ["session_a", "session_b"]
  );
});

test("starts a managed session and makes it the selected target", async () => {
  const { api } = createControlApi(async (request) =>
    createSnapshot("session_new", "running", "2026-04-09T12:00:00.000Z", request.title ?? "New session")
  );

  const result = await api.startSession({
    title: "Realtime board start"
  });

  assert.equal(result.session.sessionId, "session_new");
  assert.equal(result.sessions.selectedSessionId, "session_new");
  assert.equal(
    result.panelUrl,
    "http://127.0.0.1:5173/?sessionId=session_new&bridgeUrl=http%3A%2F%2F127.0.0.1%3A4317"
  );
});
