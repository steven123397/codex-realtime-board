import assert from "node:assert/strict";
import test from "node:test";

import { BridgeApiError } from "./api.js";
import {
  buildOverviewTimeline,
  createDemoBoardState,
  loadPanelSnapshot,
  readPanelTargetFromSearch
} from "./panelState.js";

test("loads live board state when bridge request succeeds", async () => {
  const bridgeState = createDemoBoardState(new Date("2026-04-08T12:00:00.000Z"));

  const result = await loadPanelSnapshot({
    baseUrl: "http://127.0.0.1:4317",
    loadBoardStateImpl: async (options) => {
      assert.equal(options.baseUrl, "http://127.0.0.1:4317");
      return bridgeState;
    }
  });

  assert.equal(result.source, "bridge");
  assert.equal(result.errorMessage, null);
  assert.deepEqual(result.board, bridgeState);
});

test("falls back to demo board state when bridge request fails", async () => {
  const fallbackState = createDemoBoardState(new Date("2026-04-08T12:00:00.000Z"));

  const result = await loadPanelSnapshot({
    fallbackState,
    loadBoardStateImpl: async () => {
      throw new Error("Bridge state request failed with status 500");
    }
  });

  assert.equal(result.source, "fallback");
  assert.equal(result.board.session.sessionId, "session_local_demo");
  assert.match(result.errorMessage ?? "", /status 500/);
  assert.deepEqual(result.board, fallbackState);
});

test("returns an empty snapshot when the requested session is missing", async () => {
  const result = await loadPanelSnapshot({
    sessionId: "missing_session",
    loadBoardStateImpl: async () => {
      throw new BridgeApiError("Bridge request failed with status 404", {
        status: 404,
        code: "session_not_found",
        details: {
          sessionId: "missing_session"
        }
      });
    }
  });

  assert.equal(result.source, "empty");
  assert.equal(result.board.session.sessionId, "missing_session");
  assert.match(result.emptyState?.title ?? "", /Session not found/);
  assert.match(result.emptyState?.body ?? "", /missing_session/);
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
