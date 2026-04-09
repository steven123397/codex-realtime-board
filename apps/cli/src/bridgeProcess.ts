import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { BridgeHealthSnapshot } from "@codex-realtime-board/shared";

import { createBridgeClient, type BridgeClient } from "./bridgeClient.js";
import { sleep, spawnDetachedProcess } from "./processUtils.js";
import { createLocalRuntimeConfig, type LocalRuntimeConfig } from "./runtimeConfig.js";

export interface BridgeReadyResult {
  bridgeBaseUrl: string;
  client: BridgeClient;
  launched: boolean;
}

export interface EnsureBridgeReadyOptions {
  config?: LocalRuntimeConfig;
  createClient?: (baseUrl: string) => BridgeClient;
  spawnBridgeProcess?: (config: LocalRuntimeConfig) => void | Promise<void>;
  sleep?: (ms: number) => Promise<void>;
  maxAttempts?: number;
  expectedMode?: "live" | "mock" | "any";
}

function defaultSleep(ms: number): Promise<void> {
  return sleep(ms);
}

function resolveBridgeEntrypoint(): string {
  const currentFile = fileURLToPath(import.meta.url);
  const cliDir = dirname(currentFile);
  const distEntry = resolve(cliDir, "../../bridge/dist/index.js");
  if (existsSync(distEntry)) {
    return distEntry;
  }

  return resolve(cliDir, "../../bridge/src/index.ts");
}

function readBridgeHostPort(bridgeBaseUrl: string): { host: string; port: string } {
  const url = new URL(bridgeBaseUrl);
  return {
    host: url.hostname,
    port: url.port || (url.protocol === "https:" ? "443" : "80")
  };
}

export function spawnLocalBridgeProcess(config: LocalRuntimeConfig): void {
  const { host, port } = readBridgeHostPort(config.bridgeBaseUrl);
  const entrypoint = resolveBridgeEntrypoint();
  const args = entrypoint.endsWith(".ts") ? ["--import", "tsx", entrypoint] : [entrypoint];

  spawnDetachedProcess(process.execPath, args, {
    env: {
      ...process.env,
      CODEX_APP_SERVER_URL: config.appServerUrl,
      CODEX_BRIDGE_HOST: host,
      CODEX_BRIDGE_PORT: port,
      CODEX_BRIDGE_BASE_URL: config.bridgeBaseUrl,
      CODEX_BOARD_PANEL_URL: config.panelBaseUrl
    }
  });
}

function modeMatches(snapshot: BridgeHealthSnapshot, expectedMode: EnsureBridgeReadyOptions["expectedMode"]): boolean {
  return expectedMode === undefined || expectedMode === "any" || snapshot.mode === expectedMode;
}

async function getBridgeHealth(client: BridgeClient): Promise<BridgeHealthSnapshot | null> {
  try {
    return await client.health();
  } catch {
    return null;
  }
}

export async function ensureBridgeReady(
  options: EnsureBridgeReadyOptions = {}
): Promise<BridgeReadyResult> {
  const config = options.config ?? createLocalRuntimeConfig();
  const createClient = options.createClient ?? ((baseUrl: string) => createBridgeClient({ baseUrl }));
  const spawnBridgeProcess = options.spawnBridgeProcess ?? spawnLocalBridgeProcess;
  const sleepImpl = options.sleep ?? defaultSleep;
  const maxAttempts = options.maxAttempts ?? 20;
  const expectedMode = options.expectedMode ?? "any";
  const client = createClient(config.bridgeBaseUrl);

  const existingHealth = await getBridgeHealth(client);
  if (existingHealth) {
    if (!modeMatches(existingHealth, expectedMode)) {
      throw new Error(
        `Bridge is running in ${existingHealth.mode} mode at ${config.bridgeBaseUrl}, expected ${expectedMode}`
      );
    }

    return {
      bridgeBaseUrl: config.bridgeBaseUrl,
      client,
      launched: false
    };
  }

  await spawnBridgeProcess(config);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await sleepImpl(250);
    const health = await getBridgeHealth(client);
    if (!health) {
      continue;
    }

    if (!modeMatches(health, expectedMode)) {
      throw new Error(
        `Bridge became ready in ${health.mode} mode at ${config.bridgeBaseUrl}, expected ${expectedMode}`
      );
    }

    return {
      bridgeBaseUrl: config.bridgeBaseUrl,
      client,
      launched: true
    };
  }

  throw new Error(`Bridge did not become ready at ${config.bridgeBaseUrl}`);
}
