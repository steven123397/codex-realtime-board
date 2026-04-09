import assert from "node:assert/strict";
import test from "node:test";

import type { AttachSessionResult, ManagedSessionSummary } from "@codex-realtime-board/shared";

import { runAttachCommand } from "./attachCommand.js";

function createSession(overrides: Partial<ManagedSessionSummary> = {}): ManagedSessionSummary {
  return {
    sessionId: "session_active",
    title: "Active session",
    status: "running",
    lastActiveAt: "2026-04-09T12:00:00.000Z",
    isManaged: true,
    canResume: true,
    ...overrides
  };
}

test("attaches to a selected managed session and opens the panel", async () => {
  const logs: string[] = [];
  let openTarget = "";
  const result: AttachSessionResult = {
    resolution: "attached",
    session: createSession(),
    sessions: {
      active: [createSession()],
      recent: [],
      selectedSessionId: "session_active"
    },
    panelUrl: "http://127.0.0.1:5173/?sessionId=session_active"
  };

  const exitCode = await runAttachCommand([], {
    io: {
      log(message) {
        logs.push(message);
      },
      error(message) {
        logs.push(`ERR:${message}`);
      }
    },
    ensureBridgeReady: async () => ({
      bridgeBaseUrl: "http://127.0.0.1:4317",
      launched: false,
      client: {
        async health() {
          throw new Error("not needed");
        },
        async listSessions() {
          throw new Error("not needed");
        },
        async startSession() {
          throw new Error("not needed");
        },
        async attachSession() {
          return result;
        }
      }
    }),
    openPanel: async (url) => {
      openTarget = url;
    }
  });

  assert.equal(exitCode, 0);
  assert.equal(openTarget, result.panelUrl);
  assert.match(logs.join("\n"), /session_active/);
});

test("prints active and recent sessions when attach requires explicit selection", async () => {
  const logs: string[] = [];
  const result: AttachSessionResult = {
    resolution: "selection-required",
    session: null,
    sessions: {
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
    },
    panelUrl: null
  };

  const exitCode = await runAttachCommand([], {
    io: {
      log(message) {
        logs.push(message);
      },
      error(message) {
        logs.push(`ERR:${message}`);
      }
    },
    ensureBridgeReady: async () => ({
      bridgeBaseUrl: "http://127.0.0.1:4317",
      launched: false,
      client: {
        async health() {
          throw new Error("not needed");
        },
        async listSessions() {
          throw new Error("not needed");
        },
        async startSession() {
          throw new Error("not needed");
        },
        async attachSession() {
          return result;
        }
      }
    }),
    openPanel: async () => {
      throw new Error("should not open panel");
    }
  });

  assert.equal(exitCode, 1);
  assert.match(logs.join("\n"), /Session A/);
  assert.match(logs.join("\n"), /session_recent/);
  assert.match(logs.join("\n"), /attach <session-id>/);
});
