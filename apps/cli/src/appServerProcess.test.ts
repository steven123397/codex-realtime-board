import assert from "node:assert/strict";
import test from "node:test";

import { ensureAppServerReady } from "./appServerProcess.js";

test("reuses an already ready app-server without spawning a new process", async () => {
  let spawnCalled = false;

  const result = await ensureAppServerReady({
    isAppServerReady: async () => true,
    spawnAppServerProcess: () => {
      spawnCalled = true;
    }
  });

  assert.equal(result.launched, false);
  assert.equal(spawnCalled, false);
});

test("spawns app-server and waits until the socket becomes ready", async () => {
  let readinessChecks = 0;
  let spawnCalled = false;

  const result = await ensureAppServerReady({
    isAppServerReady: async () => {
      readinessChecks += 1;
      return readinessChecks >= 3;
    },
    spawnAppServerProcess: () => {
      spawnCalled = true;
    },
    sleep: async () => {},
    maxAttempts: 5
  });

  assert.equal(result.launched, true);
  assert.equal(spawnCalled, true);
  assert.equal(readinessChecks, 3);
});
