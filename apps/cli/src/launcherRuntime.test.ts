import assert from "node:assert/strict";
import test from "node:test";

import { ensureLauncherReady } from "./launcherRuntime.js";
import { createLocalRuntimeConfig } from "./runtimeConfig.js";

test("ensures app-server, bridge, and panel in sequence with shared runtime config", async () => {
  const calls: string[] = [];
  const config = createLocalRuntimeConfig({
    CODEX_BOARD_APP_SERVER_URL: "ws://127.0.0.1:3918",
    CODEX_BOARD_BRIDGE_URL: "http://127.0.0.1:4317",
    CODEX_BOARD_PANEL_URL: "http://127.0.0.1:5173"
  });

  const result = await ensureLauncherReady({
    config,
    ensureAppServerReady: async (options) => {
      calls.push(`app-server:${options.config?.appServerUrl}`);
      return {
        appServerUrl: options.config!.appServerUrl,
        launched: true
      };
    },
    ensureBridgeReady: async (options) => {
      calls.push(`bridge:${options.config?.bridgeBaseUrl}:${options.expectedMode}`);
      return {
        bridgeBaseUrl: options.config!.bridgeBaseUrl,
        launched: false,
        client: {
          async health() {
            throw new Error("not needed");
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
        }
      };
    },
    ensurePanelReady: async (options) => {
      calls.push(`panel:${options.config?.panelBaseUrl}`);
      return {
        panelBaseUrl: options.config!.panelBaseUrl,
        launched: true
      };
    }
  });

  assert.deepEqual(calls, [
    "app-server:ws://127.0.0.1:3918",
    "bridge:http://127.0.0.1:4317:live",
    "panel:http://127.0.0.1:5173"
  ]);
  assert.equal(result.config.bridgeBaseUrl, "http://127.0.0.1:4317");
});
