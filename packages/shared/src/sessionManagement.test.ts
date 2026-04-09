import assert from "node:assert/strict";
import test from "node:test";

import {
  PANEL_BRIDGE_URL_QUERY_PARAM,
  PANEL_SESSION_ID_QUERY_PARAM,
  isManagedSessionActive,
  partitionManagedSessions,
  type ManagedSessionSummary
} from "./sessionManagement.js";

function createSession(overrides: Partial<ManagedSessionSummary> = {}): ManagedSessionSummary {
  return {
    sessionId: "session_default",
    title: "Default session",
    status: "running",
    lastActiveAt: "2026-04-09T10:00:00.000Z",
    isManaged: true,
    canResume: true,
    ...overrides
  };
}

test("treats only running and waiting-user sessions as active managed sessions", () => {
  assert.equal(isManagedSessionActive("running"), true);
  assert.equal(isManagedSessionActive("waiting-user"), true);
  assert.equal(isManagedSessionActive("idle"), false);
  assert.equal(isManagedSessionActive("completed"), false);
  assert.equal(isManagedSessionActive("error"), false);
});

test("partitions managed sessions into active and recent buckets ordered by last activity", () => {
  const sessions = [
    createSession({
      sessionId: "session_recent",
      status: "completed",
      lastActiveAt: "2026-04-09T09:30:00.000Z"
    }),
    createSession({
      sessionId: "session_waiting",
      status: "waiting-user",
      lastActiveAt: "2026-04-09T10:15:00.000Z"
    }),
    createSession({
      sessionId: "session_running",
      status: "running",
      lastActiveAt: "2026-04-09T10:30:00.000Z"
    })
  ];

  const snapshot = partitionManagedSessions(sessions, "session_waiting");

  assert.deepEqual(
    snapshot.active.map((session) => session.sessionId),
    ["session_running", "session_waiting"]
  );
  assert.deepEqual(
    snapshot.recent.map((session) => session.sessionId),
    ["session_recent"]
  );
  assert.equal(snapshot.selectedSessionId, "session_waiting");
});

test("exports stable panel routing query parameter names", () => {
  assert.equal(PANEL_SESSION_ID_QUERY_PARAM, "sessionId");
  assert.equal(PANEL_BRIDGE_URL_QUERY_PARAM, "bridgeUrl");
});
