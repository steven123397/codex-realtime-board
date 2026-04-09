import type {
  AttachSessionRequest,
  AttachSessionResult,
  BridgeHealthSnapshot,
  ManagedSessionListSnapshot,
  StartSessionRequest,
  StartSessionResult
} from "@codex-realtime-board/shared";

export const DEFAULT_BRIDGE_BASE_URL = "http://127.0.0.1:4317";

export interface BridgeClient {
  health(): Promise<BridgeHealthSnapshot>;
  listSessions(): Promise<ManagedSessionListSnapshot>;
  startSession(request: StartSessionRequest): Promise<StartSessionResult>;
  attachSession(request: AttachSessionRequest): Promise<AttachSessionResult>;
}

export interface BridgeClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

async function requestJson<TResponse>(
  baseUrl: string,
  path: string,
  init: RequestInit,
  fetchImpl: typeof fetch
): Promise<TResponse> {
  const response = await fetchImpl(`${baseUrl}${path}`, init);
  if (!response.ok) {
    throw new Error(`Bridge request failed with status ${response.status} for ${path}`);
  }

  return (await response.json()) as TResponse;
}

export function createBridgeClient(options: BridgeClientOptions = {}): BridgeClient {
  const baseUrl = options.baseUrl ?? DEFAULT_BRIDGE_BASE_URL;
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    health() {
      return requestJson(baseUrl, "/healthz", { method: "GET" }, fetchImpl);
    },
    listSessions() {
      return requestJson(baseUrl, "/api/sessions", { method: "GET" }, fetchImpl);
    },
    startSession(request) {
      return requestJson(
        baseUrl,
        "/api/session/start",
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(request)
        },
        fetchImpl
      );
    },
    attachSession(request) {
      return requestJson(
        baseUrl,
        "/api/session/attach",
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(request)
        },
        fetchImpl
      );
    }
  };
}
