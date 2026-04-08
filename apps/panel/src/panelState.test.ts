import assert from "node:assert/strict";
import test from "node:test";

import { buildOverviewTimeline, createDemoBoardState, loadPanelSnapshot } from "./panelState.js";

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
