import assert from "node:assert/strict";
import test from "node:test";

import { ensureBridgeReady } from "./bridgeProcess.js";
import { createLocalRuntimeConfig } from "./runtimeConfig.js";

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
    },
    expectedMode: "live"
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
    maxAttempts: 5,
    expectedMode: "live"
  });

  assert.equal(result.launched, true);
  assert.equal(spawnCalled, true);
  assert.equal(healthChecks, 3);
});

test("passes launcher runtime configuration into bridge startup", async () => {
  const config = createLocalRuntimeConfig({
    CODEX_BOARD_APP_SERVER_URL: "ws://127.0.0.1:3918",
    CODEX_BOARD_BRIDGE_URL: "http://127.0.0.1:4317",
    CODEX_BOARD_PANEL_URL: "http://127.0.0.1:5173"
  });
  let receivedBridgeUrl = "";
  let receivedAppServerUrl = "";
  let receivedPanelUrl = "";

  await ensureBridgeReady({
    config,
    createClient: () => ({
      async health() {
        throw new Error("not ready");
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
    spawnBridgeProcess: (runtimeConfig) => {
      receivedBridgeUrl = runtimeConfig.bridgeBaseUrl;
      receivedAppServerUrl = runtimeConfig.appServerUrl;
      receivedPanelUrl = runtimeConfig.panelBaseUrl;
    },
    sleep: async () => {},
    maxAttempts: 0
  }).catch((error) => {
    assert.match(String(error), /did not become ready/);
  });

  assert.equal(receivedBridgeUrl, "http://127.0.0.1:4317");
  assert.equal(receivedAppServerUrl, "ws://127.0.0.1:3918");
  assert.equal(receivedPanelUrl, "http://127.0.0.1:5173");
});
