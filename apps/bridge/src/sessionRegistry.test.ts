import assert from "node:assert/strict";
import test from "node:test";

import type { BoardStateSnapshot, SessionStatus } from "@codex-realtime-board/shared";

import { createEmptyBridgeState } from "./bridgeState.js";
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

test("keeps active and recent managed sessions ordered by last activity", () => {
  const registry = createSessionRegistry();
  registry.upsertState(createSnapshot("session_recent", "completed", "2026-04-09T09:00:00.000Z"));
  registry.upsertState(createSnapshot("session_waiting", "waiting-user", "2026-04-09T10:15:00.000Z"));
  registry.upsertState(createSnapshot("session_running", "running", "2026-04-09T10:30:00.000Z"));

  const sessions = registry.listSessions();

  assert.deepEqual(
    sessions.active.map((session) => session.sessionId),
    ["session_running", "session_waiting"]
  );
  assert.deepEqual(
    sessions.recent.map((session) => session.sessionId),
    ["session_recent"]
  );
  assert.equal(sessions.selectedSessionId, "session_running");
});

test("returns the selected snapshot by default and reports missing sessions", () => {
  const registry = createSessionRegistry();
  const running = createSnapshot("session_running", "running", "2026-04-09T10:30:00.000Z");
  const recent = createSnapshot("session_recent", "completed", "2026-04-09T09:00:00.000Z");

  registry.upsertState(running);
  registry.upsertState(recent, { select: true });

  assert.equal(registry.getState()?.session.sessionId, "session_recent");
  assert.equal(registry.getState("session_running")?.session.sessionId, "session_running");
  assert.equal(registry.getState("missing"), null);
});

test("returns cursor-based sync results for unchanged and updated sessions", () => {
  const registry = createSessionRegistry();
  registry.upsertState(createSnapshot("session_running", "running", "2026-04-09T10:30:00.000Z"));

  const initial = registry.getStateSync("session_running");
  assert.ok(initial);
  assert.equal(initial?.kind, "snapshot");
  assert.equal(initial?.snapshot.session.sessionId, "session_running");
  assert.match(initial?.cursor ?? "", /^cursor_/);

  const unchanged = registry.getStateSync("session_running", initial?.cursor ?? null);
  assert.deepEqual(unchanged, {
    kind: "unchanged",
    cursor: initial?.cursor
  });

  registry.upsertState(
    createSnapshot("session_running", "waiting-user", "2026-04-09T10:45:00.000Z", "Updated session")
  );

  const updated = registry.getStateSync("session_running", initial?.cursor ?? null);
  assert.ok(updated);
  assert.equal(updated?.kind, "snapshot");
  assert.notEqual(updated?.cursor, initial?.cursor);
  assert.equal(updated?.snapshot.session.title, "Updated session");
  assert.equal(updated?.snapshot.session.status, "waiting-user");
});
