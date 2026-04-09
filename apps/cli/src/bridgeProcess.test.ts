import assert from "node:assert/strict";
import test from "node:test";

import { ensureBridgeReady } from "./bridgeProcess.js";

test("reuses an already healthy bridge without spawning a new process", async () => {
  let spawnCalled = false;

  const result = await ensureBridgeReady({
    createClient: () => ({
      async health() {
        return {
          ok: true,
          mode: "live",
          message: "ready"
        };
      },
      async listSessions() {
        throw new Error("not needed");
      },
      async startSession() {
        throw new Error("not needed");
      },
      async attachSession() {
        throw new Error("not needed");
      }
    }),
    spawnBridgeProcess: () => {
      spawnCalled = true;
    }
  });

  assert.equal(result.launched, false);
  assert.equal(spawnCalled, false);
});

test("spawns the bridge and waits until health checks succeed", async () => {
  let healthChecks = 0;
  let spawnCalled = false;

  const result = await ensureBridgeReady({
    createClient: () => ({
      async health() {
        healthChecks += 1;
        if (healthChecks < 3) {
          throw new Error("not ready");
        }

        return {
          ok: true,
          mode: "live",
          message: "ready"
        };
      },
      async listSessions() {
        throw new Error("not needed");
      },
      async startSession() {
        throw new Error("not needed");
      },
      async attachSession() {
        throw new Error("not needed");
      }
    }),
    spawnBridgeProcess: () => {
      spawnCalled = true;
    },
    sleep: async () => {},
    maxAttempts: 5
  });

  assert.equal(result.launched, true);
  assert.equal(spawnCalled, true);
  assert.equal(healthChecks, 3);
});
