import assert from "node:assert/strict";
import test from "node:test";

import { createBridgeStateStore } from "./bridgeState.js";

test("maps token usage notifications into context budget", () => {
  const store = createBridgeStateStore();

  store.applyNotification(
    {
      method: "thread/tokenUsage/updated",
      params: {
        threadId: "thread_live",
        turnId: "turn_live",
        tokenUsage: {
          total: {
            totalTokens: 38240,
            inputTokens: 25100,
            cachedInputTokens: 1100,
            outputTokens: 13140,
            reasoningOutputTokens: 2450
          },
          last: {
            totalTokens: 1024,
            inputTokens: 512,
            cachedInputTokens: 64,
            outputTokens: 512,
            reasoningOutputTokens: 128
          },
          modelContextWindow: 128000
        }
      }
    },
    new Date("2026-04-08T10:00:00.000Z")
  );

  const state = store.getState();
  assert.equal(state.session.sessionId, "thread_live");
  assert.equal(state.context.usedTokens, 38240);
  assert.equal(state.context.contextWindow, 128000);
  assert.equal(state.context.remainingTokens, 89760);
  assert.equal(state.overview.contextBudget.remainingTokens, 89760);
});

test("records web search notifications as active search sessions", () => {
  const store = createBridgeStateStore();

  store.applyNotification(
    {
      method: "item/started",
      params: {
        threadId: "thread_live",
        turnId: "turn_live",
        item: {
          type: "webSearch",
          id: "search_1",
          query: "codex app-server structured events",
          action: {
            type: "search",
            query: "codex app-server structured events",
            queries: ["codex app-server structured events"]
          }
        }
      }
    },
    new Date("2026-04-08T10:01:00.000Z")
  );

  const state = store.getState();
  assert.equal(state.overview.currentTool, "webSearch");
  assert.equal(state.overview.currentPhase, "searching");
  assert.equal(state.searches[0]?.query, "codex app-server structured events");
  assert.equal(state.searches[0]?.status, "active");
});

test("marks pending user input when thread status indicates it", () => {
  const store = createBridgeStateStore();

  store.applyNotification(
    {
      method: "thread/status/changed",
      params: {
        threadId: "thread_live",
        status: {
          type: "active",
          activeFlags: ["waitingOnUserInput"]
        }
      }
    },
    new Date("2026-04-08T10:02:00.000Z")
  );

  const state = store.getState();
  assert.equal(state.session.status, "waiting-user");
  assert.deepEqual(state.overview.pendingUserAction, {
    kind: "input",
    label: "Waiting for user input"
  });
});

test("marks a session as completed when the turn finishes without error", () => {
  const store = createBridgeStateStore();

  store.applyNotification(
    {
      method: "thread/status/changed",
      params: {
        threadId: "thread_live",
        status: {
          type: "active",
          activeFlags: []
        }
      }
    },
    new Date("2026-04-09T10:00:00.000Z")
  );

  store.applyNotification(
    {
      method: "turn/completed",
      params: {
        threadId: "thread_live",
        turn: {
          id: "turn_live",
          items: [],
          status: "completed",
          error: null
        }
      }
    },
    new Date("2026-04-09T10:02:00.000Z")
  );

  const state = store.getState();
  assert.equal(state.session.status, "completed");
  assert.equal(state.overview.currentPhase, "completed");
});
