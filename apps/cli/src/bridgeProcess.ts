import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createBridgeClient, DEFAULT_BRIDGE_BASE_URL, type BridgeClient } from "./bridgeClient.js";

export interface BridgeReadyResult {
  bridgeBaseUrl: string;
  client: BridgeClient;
  launched: boolean;
}

export interface EnsureBridgeReadyOptions {
  bridgeBaseUrl?: string;
  createClient?: (baseUrl: string) => BridgeClient;
  spawnBridgeProcess?: (baseUrl: string) => void | Promise<void>;
  sleep?: (ms: number) => Promise<void>;
  maxAttempts?: number;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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

export function spawnLocalBridgeProcess(baseUrl: string): void {
  const url = new URL(baseUrl);
  const entrypoint = resolveBridgeEntrypoint();
  const args = entrypoint.endsWith(".ts") ? ["--import", "tsx", entrypoint] : [entrypoint];

  const child = spawn(process.execPath, args, {
    detached: true,
    stdio: "ignore",
    env: {
      ...process.env,
      CODEX_BRIDGE_HOST: url.hostname,
      CODEX_BRIDGE_PORT: url.port || (url.protocol === "https:" ? "443" : "80"),
      CODEX_BRIDGE_BASE_URL: baseUrl
    }
  });
  child.unref();
}

async function isBridgeHealthy(client: BridgeClient): Promise<boolean> {
  try {
    await client.health();
    return true;
  } catch {
    return false;
  }
}

export async function ensureBridgeReady(
  options: EnsureBridgeReadyOptions = {}
): Promise<BridgeReadyResult> {
  const bridgeBaseUrl = options.bridgeBaseUrl ?? DEFAULT_BRIDGE_BASE_URL;
  const createClient = options.createClient ?? ((baseUrl: string) => createBridgeClient({ baseUrl }));
  const spawnBridgeProcess = options.spawnBridgeProcess ?? spawnLocalBridgeProcess;
  const sleep = options.sleep ?? defaultSleep;
  const maxAttempts = options.maxAttempts ?? 20;
  const client = createClient(bridgeBaseUrl);

  if (await isBridgeHealthy(client)) {
    return {
      bridgeBaseUrl,
      client,
      launched: false
    };
  }

  await spawnBridgeProcess(bridgeBaseUrl);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await sleep(250);
    if (await isBridgeHealthy(client)) {
      return {
        bridgeBaseUrl,
        client,
        launched: true
      };
    }
  }

  throw new Error(`Bridge did not become ready at ${bridgeBaseUrl}`);
}
