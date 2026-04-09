import { createLocalRuntimeConfig, type LocalRuntimeConfig } from "./runtimeConfig.js";
import { sleep, spawnDetachedProcess } from "./processUtils.js";

export interface PanelReadyResult {
  panelBaseUrl: string;
  launched: boolean;
}

export interface EnsurePanelReadyOptions {
  config?: LocalRuntimeConfig;
  isPanelReady?: (config: LocalRuntimeConfig) => Promise<boolean>;
  spawnPanelProcess?: (config: LocalRuntimeConfig) => void | Promise<void>;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  maxAttempts?: number;
}

function getPanelHostPort(panelBaseUrl: string): { host: string; port: string } {
  const url = new URL(panelBaseUrl);
  return {
    host: url.hostname,
    port: url.port || (url.protocol === "https:" ? "443" : "80")
  };
}

export function spawnLocalPanelProcess(config: LocalRuntimeConfig): void {
  const { host, port } = getPanelHostPort(config.panelBaseUrl);
  spawnDetachedProcess("corepack", [
    "pnpm",
    "--filter",
    "@codex-realtime-board/panel",
    "dev",
    "--",
    "--host",
    host,
    "--port",
    port
  ]);
}

async function fetchPanelStatus(config: LocalRuntimeConfig, fetchImpl: typeof fetch): Promise<boolean> {
  try {
    const response = await fetchImpl(config.panelBaseUrl);
    return response.ok;
  } catch {
    return false;
  }
}

export async function ensurePanelReady(
  options: EnsurePanelReadyOptions = {}
): Promise<PanelReadyResult> {
  const config = options.config ?? createLocalRuntimeConfig();
  const fetchImpl = options.fetchImpl ?? fetch;
  const isPanelReady = options.isPanelReady ?? ((runtimeConfig) => fetchPanelStatus(runtimeConfig, fetchImpl));
  const spawnPanelProcess = options.spawnPanelProcess ?? spawnLocalPanelProcess;
  const sleepImpl = options.sleep ?? sleep;
  const maxAttempts = options.maxAttempts ?? 20;

  if (await isPanelReady(config)) {
    return {
      panelBaseUrl: config.panelBaseUrl,
      launched: false
    };
  }

  await spawnPanelProcess(config);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await sleepImpl(250);
    if (await isPanelReady(config)) {
      return {
        panelBaseUrl: config.panelBaseUrl,
        launched: true
      };
    }
  }

  throw new Error(`Panel runtime did not become ready at ${config.panelBaseUrl}`);
}
