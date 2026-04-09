import assert from "node:assert/strict";
import test from "node:test";

import type { AppServerClient } from "./appServerClient.js";
import type { AppServerNotificationMessage } from "./appServerProtocol.js";
import { createLiveBridgeRuntime } from "./liveBridge.js";

function createThread(id: string, name: string) {
  return {
    id,
    preview: name,
    ephemeral: true,
    modelProvider: "openai",
    createdAt: Date.parse("2026-04-09T12:00:00.000Z"),
    updatedAt: Date.parse("2026-04-09T12:00:00.000Z"),
    status: {
      type: "active" as const,
      activeFlags: []
    },
    path: null,
    cwd: "/workspace",
    cliVersion: "0.118.0",
    source: "codex",
    agentNickname: null,
    agentRole: null,
    name,
    turns: []
  };
}

function createFakeClient(): AppServerClient {
  let notificationListener: ((notification: AppServerNotificationMessage) => void) | null = null;

  return {
    async initialize() {
      throw new Error("not needed");
    },
    async startThread() {
      throw new Error("not implemented");
    },
    async resumeThread() {
      throw new Error("not needed");
    },
    async readThread() {
      throw new Error("not needed");
    },
    async startTurn() {
      throw new Error("not implemented");
    },
    onNotification(listener) {
      notificationListener = listener;
      return () => {
        notificationListener = null;
      };
    },
    close() {
      notificationListener = null;
    }
  };
}

test("routes live notifications into per-session registry snapshots", () => {
  const client = createFakeClient();
  const runtime = createLiveBridgeRuntime(client, {
    liveUrl: "ws://127.0.0.1:3918",
    cwd: "/workspace",
    getBridgeBaseUrl: () => "http://127.0.0.1:4317",
    getPanelBaseUrl: () => "http://127.0.0.1:5173"
  });

  runtime.handleNotification({
    method: "thread/started",
    params: {
      thread: createThread("thread_a", "Thread A")
    }
  });
  runtime.handleNotification({
    method: "thread/tokenUsage/updated",
    params: {
      threadId: "thread_a",
      turnId: "turn_a",
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
  });
  runtime.handleNotification({
    method: "thread/started",
    params: {
      thread: {
        ...createThread("thread_b", "Thread B"),
        status: {
          type: "idle" as const
        }
      }
    }
  });

  const sessions = runtime.controlApi.listSessions();
  assert.deepEqual(
    sessions.active.map((session) => session.sessionId),
    ["thread_a"]
  );
  assert.deepEqual(
    sessions.recent.map((session) => session.sessionId),
    ["thread_b"]
  );
  assert.equal(runtime.controlApi.getState("thread_a")?.context.remainingTokens, 6144);
});

test("starts a managed live session through the app-server client", async () => {
  let startedThreadId = "";
  let startedTurnThreadId = "";
  const client: AppServerClient = {
    async initialize() {
      throw new Error("not needed");
    },
    async startThread(params) {
      assert.equal(params.cwd, "/workspace");
      startedThreadId = "thread_new";
      return {
        thread: createThread("thread_new", "Thread from app-server"),
        model: "gpt-5.4",
        modelProvider: "openai"
      };
    },
    async resumeThread() {
      throw new Error("not needed");
    },
    async readThread() {
      throw new Error("not needed");
    },
    async startTurn(params) {
      startedTurnThreadId = params.threadId;
      return {
        turn: {
          id: "turn_new",
          items: [],
          status: "running",
          error: null
        }
      };
    },
    onNotification() {
      return () => {};
    },
    close() {}
  };

  const runtime = createLiveBridgeRuntime(client, {
    liveUrl: "ws://127.0.0.1:3918",
    cwd: "/workspace",
    getBridgeBaseUrl: () => "http://127.0.0.1:4317",
    getPanelBaseUrl: () => "http://127.0.0.1:5173"
  });

  const result = await runtime.controlApi.startSession({
    title: "Realtime board start",
    prompt: "Summarize the current workspace"
  });

  assert.equal(startedThreadId, "thread_new");
  assert.equal(startedTurnThreadId, "thread_new");
  assert.equal(result.session.sessionId, "thread_new");
  assert.equal(runtime.controlApi.getState("thread_new")?.session.title, "Realtime board start");
  assert.match(result.panelUrl, /sessionId=thread_new/);
});
