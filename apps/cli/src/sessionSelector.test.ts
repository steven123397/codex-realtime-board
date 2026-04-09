import assert from "node:assert/strict";
import test from "node:test";

import type { ManagedSessionListSnapshot, ManagedSessionSummary } from "@codex-realtime-board/shared";

import {
  renderSessionSelection,
  resolveSessionSelection
} from "./sessionSelector.js";

function createSession(overrides: Partial<ManagedSessionSummary> = {}): ManagedSessionSummary {
  return {
    sessionId: "session_default",
    title: "Default session",
    status: "running",
    lastActiveAt: "2026-04-09T12:00:00.000Z",
    isManaged: true,
    canResume: true,
    ...overrides
  };
}

function createSnapshot(): ManagedSessionListSnapshot {
  return {
    active: [
      createSession({
        sessionId: "session_a",
        title: "Session A"
      }),
      createSession({
        sessionId: "session_b",
        title: "Session B",
        lastActiveAt: "2026-04-09T11:00:00.000Z"
      })
    ],
    recent: [
      createSession({
        sessionId: "session_recent",
        title: "Recent session",
        status: "completed",
        lastActiveAt: "2026-04-09T09:00:00.000Z"
      })
    ],
    selectedSessionId: null
  };
}

test("renders grouped active and recent sessions with stable numbering", () => {
  const output = renderSessionSelection(createSnapshot());

  assert.match(output, /Active sessions:/);
  assert.match(output, /1\. session_a/);
  assert.match(output, /2\. session_b/);
  assert.match(output, /Recent sessions:/);
  assert.match(output, /3\. session_recent/);
});

test("resolves numeric selections against the combined active and recent list", () => {
  const selection = resolveSessionSelection(createSnapshot(), "2");

  assert.equal(selection.session?.sessionId, "session_b");
  assert.equal(selection.error, null);
});

test("returns a clear error when the selection is invalid", () => {
  const selection = resolveSessionSelection(createSnapshot(), "99");

  assert.equal(selection.session, null);
  assert.match(selection.error ?? "", /Enter a number between 1 and 3/);
});
