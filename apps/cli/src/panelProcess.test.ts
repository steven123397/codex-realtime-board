import assert from "node:assert/strict";
import test from "node:test";

import { ensurePanelReady } from "./panelProcess.js";

test("reuses an already ready panel runtime without spawning a new process", async () => {
  let spawnCalled = false;

  const result = await ensurePanelReady({
    isPanelReady: async () => true,
    spawnPanelProcess: () => {
      spawnCalled = true;
    }
  });

  assert.equal(result.launched, false);
  assert.equal(spawnCalled, false);
});

test("spawns panel runtime and waits until the url becomes ready", async () => {
  let readinessChecks = 0;
  let spawnCalled = false;

  const result = await ensurePanelReady({
    isPanelReady: async () => {
      readinessChecks += 1;
      return readinessChecks >= 2;
    },
    spawnPanelProcess: () => {
      spawnCalled = true;
    },
    sleep: async () => {},
    maxAttempts: 5
  });

  assert.equal(result.launched, true);
  assert.equal(spawnCalled, true);
  assert.equal(readinessChecks, 2);
});
