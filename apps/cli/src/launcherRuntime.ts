import {
  ensureAppServerReady,
  type AppServerReadyResult,
  type EnsureAppServerReadyOptions
} from "./appServerProcess.js";
import {
  ensureBridgeReady,
  type BridgeReadyResult,
  type EnsureBridgeReadyOptions
} from "./bridgeProcess.js";
import {
  ensurePanelReady,
  type EnsurePanelReadyOptions,
  type PanelReadyResult
} from "./panelProcess.js";
import { createLocalRuntimeConfig, type LocalRuntimeConfig } from "./runtimeConfig.js";

export interface LauncherReadyResult {
  config: LocalRuntimeConfig;
  appServer: AppServerReadyResult;
  bridge: BridgeReadyResult;
  panel: PanelReadyResult;
}

export interface EnsureLauncherReadyOptions {
  config?: LocalRuntimeConfig;
  ensureAppServerReady?: (options: EnsureAppServerReadyOptions) => Promise<AppServerReadyResult>;
  ensureBridgeReady?: (options: EnsureBridgeReadyOptions) => Promise<BridgeReadyResult>;
  ensurePanelReady?: (options: EnsurePanelReadyOptions) => Promise<PanelReadyResult>;
}

export async function ensureLauncherReady(
  options: EnsureLauncherReadyOptions = {}
): Promise<LauncherReadyResult> {
  const config = options.config ?? createLocalRuntimeConfig();
  const ensureAppServerReadyImpl = options.ensureAppServerReady ?? ensureAppServerReady;
  const ensureBridgeReadyImpl = options.ensureBridgeReady ?? ensureBridgeReady;
  const ensurePanelReadyImpl = options.ensurePanelReady ?? ensurePanelReady;

  const appServer = await ensureAppServerReadyImpl({
    config
  });
  const bridge = await ensureBridgeReadyImpl({
    config,
    expectedMode: "live"
  });
  const panel = await ensurePanelReadyImpl({
    config
  });

  return {
    config,
    appServer,
    bridge,
    panel
  };
}
