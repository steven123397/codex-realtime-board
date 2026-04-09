export interface LocalRuntimeConfig {
  appServerUrl: string;
  bridgeBaseUrl: string;
  panelBaseUrl: string;
}

export function createLocalRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env
): LocalRuntimeConfig {
  return {
    appServerUrl: env.CODEX_BOARD_APP_SERVER_URL ?? "ws://127.0.0.1:3918",
    bridgeBaseUrl: env.CODEX_BOARD_BRIDGE_URL ?? "http://127.0.0.1:4317",
    panelBaseUrl: env.CODEX_BOARD_PANEL_URL ?? "http://127.0.0.1:5173"
  };
}
