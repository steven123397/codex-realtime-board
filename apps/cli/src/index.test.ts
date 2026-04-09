import assert from "node:assert/strict";
import test from "node:test";

import type { AttachSessionResult, ManagedSessionSummary, StartSessionResult } from "@codex-realtime-board/shared";

import { runCli } from "./index.js";

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

test("runs the start command through the bridge control path", async () => {
  const logs: string[] = [];
  let openTarget = "";
  const startResult: StartSessionResult = {
    session: createSession({
      sessionId: "session_started",
      title: "Started session"
    }),
    sessions: {
      active: [createSession({ sessionId: "session_started", title: "Started session" })],
      recent: [],
      selectedSessionId: "session_started"
    },
    panelUrl: "http://127.0.0.1:5173/?sessionId=session_started"
  };

  const exitCode = await runCli(["start"], {
    io: {
      log(message) {
        logs.push(message);
      },
      error(message) {
        logs.push(`ERR:${message}`);
      }
    },
    runStartCommand: async (_args, deps) => {
      await deps.openPanel?.(startResult.panelUrl);
      deps.io!.log(`[codex-board] start -> ${startResult.session.sessionId}`);
      deps.io!.log(startResult.panelUrl);
      return 0;
    },
    openPanel: async (url) => {
      openTarget = url;
    }
  });

  assert.equal(exitCode, 0);
  assert.equal(openTarget, startResult.panelUrl);
  assert.match(logs.join("\n"), /session_started/);
});

test("ignores a leading pnpm argument separator before dispatching commands", async () => {
  const receivedArgs: string[][] = [];

  const exitCode = await runCli(["--", "start", "Summarize the current workspace"], {
    io: {
      log() {},
      error() {}
    },
    runStartCommand: async (args) => {
      receivedArgs.push(args);
      return 0;
    }
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(receivedArgs, [["Summarize the current workspace"]]);
});

test("shows selection guidance when attach needs an explicit session id", async () => {
  const logs: string[] = [];
  const attachResult: AttachSessionResult = {
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
      recent: [],
      selectedSessionId: null
    },
    panelUrl: null
  };

  const exitCode = await runCli(["attach"], {
    io: {
      log(message) {
        logs.push(message);
      },
      error(message) {
        logs.push(`ERR:${message}`);
      }
    },
    runAttachCommand: async (_args, deps) => {
      deps.io!.log("Active sessions:");
      deps.io!.log(`1. ${attachResult.sessions.active[0]!.sessionId}`);
      deps.io!.log(`2. ${attachResult.sessions.active[1]!.sessionId}`);
      deps.io!.log("Run `codex-board attach <session-id>` to select one.");
      return 1;
    }
  });

  assert.equal(exitCode, 1);
  assert.match(logs.join("\n"), /session_a/);
  assert.match(logs.join("\n"), /attach <session-id>/);
});
