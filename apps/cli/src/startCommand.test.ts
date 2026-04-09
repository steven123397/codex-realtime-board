import assert from "node:assert/strict";
import test from "node:test";

import type { ManagedSessionSummary, StartSessionResult } from "@codex-realtime-board/shared";

import { runStartCommand } from "./startCommand.js";

function createSession(overrides: Partial<ManagedSessionSummary> = {}): ManagedSessionSummary {
  return {
    sessionId: "session_started",
    title: "Started session",
    status: "running",
    lastActiveAt: "2026-04-09T12:00:00.000Z",
    isManaged: true,
    canResume: true,
    ...overrides
  };
}

test("starts a managed session after ensuring the bridge is ready", async () => {
  const logs: string[] = [];
  let openTarget = "";
  let requestedPrompt = "";
  let requestedCwd = "";
  const result: StartSessionResult = {
    session: createSession(),
    sessions: {
      active: [createSession()],
      recent: [],
      selectedSessionId: "session_started"
    },
    panelUrl: "http://127.0.0.1:5173/?sessionId=session_started"
  };

  const exitCode = await runStartCommand(["Summarize", "the", "workspace"], {
    cwd: "/workspace",
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
      launched: true,
      client: {
        async health() {
          throw new Error("not needed");
        },
        async listSessions() {
          throw new Error("not needed");
        },
        async startSession(request) {
          requestedPrompt = request.prompt ?? "";
          requestedCwd = request.cwd ?? "";
          return result;
        },
        async attachSession() {
          throw new Error("not needed");
        }
      }
    }),
    openPanel: async (url) => {
      openTarget = url;
    }
  });

  assert.equal(exitCode, 0);
  assert.equal(requestedPrompt, "Summarize the workspace");
  assert.equal(requestedCwd, "/workspace");
  assert.equal(openTarget, result.panelUrl);
  assert.match(logs.join("\n"), /session_started/);
  assert.match(logs.join("\n"), /127.0.0.1:4317/);
});
