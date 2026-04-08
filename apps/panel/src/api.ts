import type { BoardStateSnapshot } from "@codex-realtime-board/shared";

export interface LoadBoardStateOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

const DEFAULT_BRIDGE_URL = "http://127.0.0.1:4317";

export async function loadBoardState(options: LoadBoardStateOptions = {}): Promise<BoardStateSnapshot> {
  const baseUrl = options.baseUrl ?? DEFAULT_BRIDGE_URL;
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(`${baseUrl}/api/state`);

  if (!response.ok) {
    throw new Error(`Bridge state request failed with status ${response.status}`);
  }

  return (await response.json()) as BoardStateSnapshot;
}
