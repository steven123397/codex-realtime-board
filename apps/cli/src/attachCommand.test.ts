import assert from "node:assert/strict";
import test from "node:test";

import type { AttachSessionResult, ManagedSessionSummary } from "@codex-realtime-board/shared";

import { runAttachCommand } from "./attachCommand.js";
import { createLocalRuntimeConfig } from "./runtimeConfig.js";

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
    ensureLauncherReady: async () => ({
      config: createLocalRuntimeConfig(),
      appServer: {
        appServerUrl: "ws://127.0.0.1:3918",
        launched: false
      },
      bridge: {
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
      },
      panel: {
        panelBaseUrl: "http://127.0.0.1:5173",
        launched: false
      }
    }),
    openPanel: async (url) => {
      openTarget = url;
    }
  });

  assert.equal(exitCode, 0);
  assert.equal(openTarget, result.panelUrl);
  assert.match(logs.join("\n"), /session_active/);
  assert.match(logs.join("\n"), /127.0.0.1:5173/);
});

test("opens an interactive selector when attach needs a target session", async () => {
  const logs: string[] = [];
  let attachCalls = 0;
  let openTarget = "";
  const selectionRequired: AttachSessionResult = {
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
  const attached: AttachSessionResult = {
    resolution: "attached",
    session: createSession({
      sessionId: "session_b",
      title: "Session B",
      lastActiveAt: "2026-04-09T11:00:00.000Z"
    }),
    sessions: {
      active: [createSession()],
      recent: [],
      selectedSessionId: "session_b"
    },
    panelUrl: "http://127.0.0.1:5173/?sessionId=session_b"
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
    ensureLauncherReady: async () => ({
      config: createLocalRuntimeConfig(),
      appServer: {
        appServerUrl: "ws://127.0.0.1:3918",
        launched: false
      },
      bridge: {
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
          async attachSession(request) {
            attachCalls += 1;
            if (attachCalls === 1) {
              assert.equal(request.sessionId, null);
              return selectionRequired;
            }

            assert.equal(request.sessionId, "session_b");
            return attached;
          }
        }
      },
      panel: {
        panelBaseUrl: "http://127.0.0.1:5173",
        launched: false
      }
    }),
    selectSession: async () => "session_b",
    openPanel: async (url) => {
      openTarget = url;
    }
  });

  assert.equal(exitCode, 0);
  assert.equal(attachCalls, 2);
  assert.equal(openTarget, attached.panelUrl);
  assert.match(logs.join("\n"), /Session A/);
  assert.match(logs.join("\n"), /session_recent/);
  assert.match(logs.join("\n"), /session_b/);
});

test("fails with a clear message when interactive selection input is invalid", async () => {
  const logs: string[] = [];
  const selectionRequired: AttachSessionResult = {
    resolution: "selection-required",
    session: null,
    sessions: {
      active: [
        createSession({
          sessionId: "session_a",
          title: "Session A"
        })
      ],
      recent: [],
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
    ensureLauncherReady: async () => ({
      config: createLocalRuntimeConfig(),
      appServer: {
        appServerUrl: "ws://127.0.0.1:3918",
        launched: false
      },
      bridge: {
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
            return selectionRequired;
          }
        }
      },
      panel: {
        panelBaseUrl: "http://127.0.0.1:5173",
        launched: false
      }
    }),
    selectSession: async () => null,
    openPanel: async () => {
      throw new Error("should not open panel");
    }
  });

  assert.equal(exitCode, 1);
  assert.match(logs.join("\n"), /Session A/);
  assert.match(logs.join("\n"), /Selection cancelled or invalid/);
});
