import assert from "node:assert/strict";
import test from "node:test";

import type { ManagedSessionListSnapshot } from "@codex-realtime-board/shared";

import { BridgeApiError } from "./api.js";
import {
  buildOverviewTimeline,
  buildPanelTargetSearch,
  createDemoBoardState,
  loadPanelSnapshot,
  readPanelTargetFromSearch
} from "./panelState.js";
import * as panelStateModule from "./panelState.js";

function createPanelSnapshot(sessionId: string) {
  const board = createDemoBoardState(new Date("2026-04-08T12:00:00.000Z"));
  board.session.sessionId = sessionId;
  board.session.title = `Session ${sessionId}`;

  return {
    board,
    source: "bridge" as const,
    connectionState: "live" as const,
    errorMessage: null,
    emptyState: null,
    loadedAt: new Date("2026-04-08T12:00:00.000Z").toISOString(),
    staleSince: null,
    lastLiveAt: new Date("2026-04-08T12:00:00.000Z").toISOString(),
    refreshFailures: 0,
    syncCursor: "cursor_initial",
    syncCapability: "supported" as const,
    sessions: null,
    sessionDirectoryError: null
  };
}

function createManagedSessions(selectedSessionId: string | null = "session_a"): ManagedSessionListSnapshot {
  return {
    active: [
      {
        sessionId: "session_a",
        title: "Session session_a",
        status: "running",
        lastActiveAt: "2026-04-08T12:00:00.000Z",
        isManaged: true,
        canResume: true
      },
      {
        sessionId: "session_b",
        title: "Session session_b",
        status: "waiting-user",
        lastActiveAt: "2026-04-08T11:58:00.000Z",
        isManaged: true,
        canResume: true
      }
    ],
    recent: [
      {
        sessionId: "session_c",
        title: "Session session_c",
        status: "completed",
        lastActiveAt: "2026-04-08T11:40:00.000Z",
        isManaged: true,
        canResume: true
      }
    ],
    selectedSessionId
  };
}

function createTimerHarness() {
  let nextId = 1;
  const scheduled = new Map<number, { callback: () => void | Promise<void>; delay: number }>();

  return {
    scheduleRefresh(callback: () => void | Promise<void>, delay: number): number {
      const id = nextId++;
      scheduled.set(id, {
        callback,
        delay
      });
      return id;
    },
    clearScheduledRefresh(timerId: unknown): void {
      if (typeof timerId === "number") {
        scheduled.delete(timerId);
      }
    },
    getPendingCount(): number {
      return scheduled.size;
    },
    getNextDelay(): number | null {
      const entry = scheduled.values().next();
      return entry.done ? null : entry.value.delay;
    },
    async runNext(): Promise<void> {
      const entry = scheduled.entries().next();
      assert.equal(entry.done, false);

      const [timerId, task] = entry.value;
      scheduled.delete(timerId);
      await task.callback();
      await Promise.resolve();
    }
  };
}

test("loads live board state when bridge request succeeds", async () => {
  const bridgeState = createDemoBoardState(new Date("2026-04-08T12:00:00.000Z"));
  const sessions = createManagedSessions("session_a");

  const result = await loadPanelSnapshot({
    baseUrl: "http://127.0.0.1:4317",
    loadBoardStateSyncImpl: async () => ({
      kind: "snapshot",
      cursor: "cursor_a",
      snapshot: bridgeState
    }),
    loadBoardStateImpl: async (options) => {
      assert.equal(options.baseUrl, "http://127.0.0.1:4317");
      return bridgeState;
    },
    loadSessionsImpl: async (options) => {
      assert.equal(options.baseUrl, "http://127.0.0.1:4317");
      return sessions;
    }
  });

  assert.equal(result.source, "bridge");
  assert.equal(result.connectionState, "live");
  assert.equal(result.errorMessage, null);
  assert.deepEqual(result.board, bridgeState);
  assert.deepEqual(result.sessions, sessions);
  assert.equal(result.sessionDirectoryError, null);
  assert.equal(result.lastLiveAt, result.loadedAt);
  assert.equal(result.refreshFailures, 0);
  assert.equal(result.staleSince, null);
  assert.equal(result.syncCursor, "cursor_a");
  assert.equal(result.syncCapability, "supported");
  assert.ok(Date.parse(result.loadedAt) > 0);
});

test("falls back to demo board state when bridge request fails", async () => {
  const fallbackState = createDemoBoardState(new Date("2026-04-08T12:00:00.000Z"));

  const result = await loadPanelSnapshot({
    fallbackState,
    loadBoardStateSyncImpl: async () => {
      throw new BridgeApiError("Bridge request failed with status 404", {
        status: 404,
        code: "not_found",
        details: null
      });
    },
    loadBoardStateImpl: async () => {
      throw new Error("Bridge state request failed with status 500");
    },
    loadSessionsImpl: async () => {
      return createManagedSessions("session_a");
    }
  });

  assert.equal(result.source, "fallback");
  assert.equal(result.board.session.sessionId, "session_local_demo");
  assert.match(result.errorMessage ?? "", /status 500/);
  assert.deepEqual(result.board, fallbackState);
  assert.equal(result.syncCursor, null);
  assert.equal(result.syncCapability, "unsupported");
});

test("returns an empty snapshot when the requested session is missing", async () => {
  const result = await loadPanelSnapshot({
    sessionId: "missing_session",
    loadBoardStateSyncImpl: async () => {
      throw new BridgeApiError("Bridge request failed with status 404", {
        status: 404,
        code: "not_found",
        details: null
      });
    },
    loadBoardStateImpl: async () => {
      throw new BridgeApiError("Bridge request failed with status 404", {
        status: 404,
        code: "session_not_found",
        details: {
          sessionId: "missing_session"
        }
      });
    },
    loadSessionsImpl: async () => {
      return createManagedSessions("session_a");
    }
  });

  assert.equal(result.source, "empty");
  assert.equal(result.board.session.sessionId, "missing_session");
  assert.match(result.emptyState?.title ?? "", /Session not found/);
  assert.match(result.emptyState?.body ?? "", /missing_session/);
  assert.equal(result.syncCapability, "unsupported");
});

test("parses session and bridge targets from panel URL search params", () => {
  const target = readPanelTargetFromSearch(
    "?sessionId=session_live&bridgeUrl=http%3A%2F%2F127.0.0.1%3A4317"
  );

  assert.deepEqual(target, {
    sessionId: "session_live",
    baseUrl: "http://127.0.0.1:4317"
  });
});

test("builds panel URL search params when switching sessions", () => {
  const nextSearch = buildPanelTargetSearch(
    "?sessionId=session_old&bridgeUrl=http%3A%2F%2F127.0.0.1%3A4317",
    {
      sessionId: "session_new",
      baseUrl: "http://127.0.0.1:4317"
    }
  );

  assert.deepEqual(readPanelTargetFromSearch(nextSearch), {
    sessionId: "session_new",
    baseUrl: "http://127.0.0.1:4317"
  });
});

test("reuses the previous board snapshot when conditional sync reports unchanged", async () => {
  const previousSnapshot = {
    ...createPanelSnapshot("session_sync"),
    loadedAt: "2026-04-08T12:00:00.000Z",
    lastLiveAt: "2026-04-08T12:00:00.000Z",
    syncCursor: "cursor_sync_1"
  };

  const result = await loadPanelSnapshot({
    previousSnapshot,
    sessionId: "session_sync",
    loadBoardStateSyncImpl: async (options) => {
      assert.equal(options.sessionId, "session_sync");
      assert.equal(options.since, "cursor_sync_1");
      return {
        kind: "unchanged",
        cursor: "cursor_sync_1"
      };
    },
    loadBoardStateImpl: async () => {
      throw new Error("full snapshot should not be loaded when sync is unchanged");
    },
    loadSessionsImpl: async () => createManagedSessions("session_sync")
  });

  assert.equal(result.source, "bridge");
  assert.equal(result.connectionState, "live");
  assert.equal(result.board.session.sessionId, "session_sync");
  assert.equal(result.syncCursor, "cursor_sync_1");
  assert.equal(result.syncCapability, "supported");
  assert.notEqual(result.loadedAt, previousSnapshot.loadedAt);
  assert.equal(result.lastLiveAt, result.loadedAt);
});

test("falls back to full snapshot loading when the conditional sync endpoint is unavailable", async () => {
  const bridgeState = createDemoBoardState(new Date("2026-04-08T12:05:00.000Z"));
  let syncAttempts = 0;
  let fullLoadCount = 0;

  const result = await loadPanelSnapshot({
    previousSnapshot: {
      ...createPanelSnapshot("session_sync"),
      syncCursor: "cursor_sync_1",
      syncCapability: "unknown"
    },
    sessionId: "session_sync",
    loadBoardStateSyncImpl: async () => {
      syncAttempts += 1;
      throw new BridgeApiError("Bridge request failed with status 404", {
        status: 404,
        code: "not_found",
        details: null
      });
    },
    loadBoardStateImpl: async () => {
      fullLoadCount += 1;
      return bridgeState;
    },
    loadSessionsImpl: async () => createManagedSessions("session_sync")
  });

  assert.equal(syncAttempts, 1);
  assert.equal(fullLoadCount, 1);
  assert.equal(result.source, "bridge");
  assert.equal(result.connectionState, "live");
  assert.deepEqual(result.board, bridgeState);
  assert.equal(result.syncCapability, "unsupported");
  assert.equal(result.syncCursor, null);
});

test("builds overview timeline from board state instead of static copy", () => {
  const board = createDemoBoardState(new Date("2026-04-08T12:00:00.000Z"));
  board.overview.pendingUserAction = {
    kind: "approval",
    label: "Waiting for approval"
  };

  const timeline = buildOverviewTimeline(board);

  assert.equal(timeline.length, 4);
  assert.match(timeline[0] ?? "", /Waiting for approval/);
  assert.match(timeline[1] ?? "", /Inspect app-server event surface/);
  assert.match(timeline[2] ?? "", /codex app-server structured events/);
  assert.match(timeline[3] ?? "", /89760/);
});

test("panel poller loads immediately and schedules the next refresh", async () => {
  const createPanelPoller = Reflect.get(panelStateModule, "createPanelPoller");
  const refreshInterval = Reflect.get(panelStateModule, "PANEL_AUTO_REFRESH_INTERVAL_MS");

  assert.equal(typeof createPanelPoller, "function");
  assert.equal(typeof refreshInterval, "number");
  if (typeof createPanelPoller !== "function" || typeof refreshInterval !== "number") {
    return;
  }

  const timer = createTimerHarness();
  const seenSessions: string[] = [];
  const loadingTransitions: boolean[] = [];
  const refreshingTransitions: boolean[] = [];
  const snapshots = [createPanelSnapshot("session_a"), createPanelSnapshot("session_b")];
  let loadCount = 0;

  const poller = createPanelPoller({
    intervalMs: refreshInterval,
    loadSnapshot: async () => snapshots[loadCount++] ?? snapshots.at(-1),
    onSnapshot(snapshot) {
      seenSessions.push(snapshot.board.session.sessionId);
    },
    onLoadingChange(loading) {
      loadingTransitions.push(loading);
    },
    onRefreshingChange(refreshing) {
      refreshingTransitions.push(refreshing);
    },
    scheduleRefresh: timer.scheduleRefresh,
    clearScheduledRefresh: timer.clearScheduledRefresh
  });

  await poller.start();

  assert.deepEqual(seenSessions, ["session_a"]);
  assert.deepEqual(loadingTransitions, [true, false]);
  assert.deepEqual(refreshingTransitions, []);
  assert.equal(timer.getPendingCount(), 1);
  assert.equal(timer.getNextDelay(), refreshInterval);

  await timer.runNext();

  assert.deepEqual(seenSessions, ["session_a", "session_b"]);
  assert.deepEqual(refreshingTransitions, [true, false]);
  assert.equal(timer.getPendingCount(), 1);
});

test("panel poller passes the previous snapshot into subsequent refresh cycles", async () => {
  const createPanelPoller = Reflect.get(panelStateModule, "createPanelPoller");

  assert.equal(typeof createPanelPoller, "function");
  if (typeof createPanelPoller !== "function") {
    return;
  }

  const timer = createTimerHarness();
  const previousSessionIds: Array<string | null> = [];
  const snapshots = [createPanelSnapshot("session_a"), createPanelSnapshot("session_b")];
  let loadCount = 0;

  const poller = createPanelPoller({
    intervalMs: 1_000,
    loadSnapshot: async ({ previousSnapshot }) => {
      previousSessionIds.push(previousSnapshot?.board.session.sessionId ?? null);
      return snapshots[loadCount++] ?? snapshots.at(-1);
    },
    onSnapshot() {},
    scheduleRefresh: timer.scheduleRefresh,
    clearScheduledRefresh: timer.clearScheduledRefresh
  });

  await poller.start();
  await timer.runNext();

  assert.deepEqual(previousSessionIds, [null, "session_a"]);
});

test("panel poller manual refresh replaces the pending timer", async () => {
  const createPanelPoller = Reflect.get(panelStateModule, "createPanelPoller");

  assert.equal(typeof createPanelPoller, "function");
  if (typeof createPanelPoller !== "function") {
    return;
  }

  const timer = createTimerHarness();
  const seenSessions: string[] = [];
  const snapshots = [createPanelSnapshot("session_a"), createPanelSnapshot("session_manual")];
  let loadCount = 0;

  const poller = createPanelPoller({
    intervalMs: 2_000,
    loadSnapshot: async () => snapshots[loadCount++] ?? snapshots.at(-1),
    onSnapshot(snapshot) {
      seenSessions.push(snapshot.board.session.sessionId);
    },
    scheduleRefresh: timer.scheduleRefresh,
    clearScheduledRefresh: timer.clearScheduledRefresh
  });

  await poller.start();
  assert.equal(timer.getPendingCount(), 1);

  await poller.refresh();

  assert.deepEqual(seenSessions, ["session_a", "session_manual"]);
  assert.equal(timer.getPendingCount(), 1);
  assert.equal(timer.getNextDelay(), 2_000);
});

test("keeps the last live snapshot visible when a refresh falls back to reconnecting", async () => {
  const previousSnapshot = {
    ...createPanelSnapshot("session_live"),
    sessions: createManagedSessions("session_live")
  };
  const sessions = createManagedSessions("session_b");

  const result = await loadPanelSnapshot({
    previousSnapshot,
    fallbackState: createDemoBoardState(new Date("2026-04-08T12:05:00.000Z")),
    loadBoardStateImpl: async () => {
      throw new Error("Bridge request failed with status 503");
    },
    loadSessionsImpl: async () => sessions
  });

  assert.equal(result.source, "bridge");
  assert.equal(result.connectionState, "stale");
  assert.equal(result.board.session.sessionId, "session_live");
  assert.equal(result.loadedAt, previousSnapshot.loadedAt);
  assert.equal(result.lastLiveAt, previousSnapshot.loadedAt);
  assert.equal(result.refreshFailures, 1);
  assert.ok(result.staleSince);
  assert.deepEqual(result.sessions, sessions);
  assert.match(result.errorMessage ?? "", /status 503/);
  assert.equal(result.syncCursor, previousSnapshot.syncCursor);
  assert.equal(result.syncCapability, "supported");
});
