import { createLocalRuntimeConfig, type LocalRuntimeConfig } from "./runtimeConfig.js";
import { isTcpUrlReachable, sleep, spawnDetachedProcess } from "./processUtils.js";

export interface AppServerReadyResult {
  appServerUrl: string;
  launched: boolean;
}

export interface EnsureAppServerReadyOptions {
  config?: LocalRuntimeConfig;
  isAppServerReady?: (config: LocalRuntimeConfig) => Promise<boolean>;
  spawnAppServerProcess?: (config: LocalRuntimeConfig) => void | Promise<void>;
  sleep?: (ms: number) => Promise<void>;
  maxAttempts?: number;
}

export function spawnLocalAppServerProcess(config: LocalRuntimeConfig): void {
  spawnDetachedProcess("codex", ["app-server", "--listen", config.appServerUrl]);
}

export async function ensureAppServerReady(
  options: EnsureAppServerReadyOptions = {}
): Promise<AppServerReadyResult> {
  const config = options.config ?? createLocalRuntimeConfig();
  const isAppServerReady = options.isAppServerReady ?? ((runtimeConfig) => isTcpUrlReachable(runtimeConfig.appServerUrl));
  const spawnAppServerProcess = options.spawnAppServerProcess ?? spawnLocalAppServerProcess;
  const sleepImpl = options.sleep ?? sleep;
  const maxAttempts = options.maxAttempts ?? 20;

  if (await isAppServerReady(config)) {
    return {
      appServerUrl: config.appServerUrl,
      launched: false
    };
  }

  await spawnAppServerProcess(config);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await sleepImpl(250);
    if (await isAppServerReady(config)) {
      return {
        appServerUrl: config.appServerUrl,
        launched: true
      };
    }
  }

  throw new Error(`Codex app-server did not become ready at ${config.appServerUrl}`);
}
