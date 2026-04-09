import type {
  BoardStateSnapshot,
  BoardStateSyncResult,
  ManagedSessionListSnapshot
} from "@codex-realtime-board/shared";

export interface LoadBoardStateOptions {
  baseUrl?: string;
  sessionId?: string | null;
  fetchImpl?: typeof fetch;
}

export interface LoadBoardStateSyncOptions {
  baseUrl?: string;
  sessionId?: string | null;
  since?: string | null;
  fetchImpl?: typeof fetch;
}

export interface LoadManagedSessionsOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export interface BridgeApiErrorOptions {
  status: number;
  code?: string | null;
  details?: unknown;
}

export class BridgeApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly details: unknown;

  constructor(message: string, options: BridgeApiErrorOptions) {
    super(message);
    this.name = "BridgeApiError";
    this.status = options.status;
    this.code = options.code ?? null;
    this.details = options.details;
  }
}

const DEFAULT_BRIDGE_URL = "http://127.0.0.1:4317";

function createBaseUrl(options: { baseUrl?: string }): string {
  return options.baseUrl ?? DEFAULT_BRIDGE_URL;
}

async function readErrorPayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text.length > 0 ? text : null;
}

export async function loadBoardState(options: LoadBoardStateOptions = {}): Promise<BoardStateSnapshot> {
  const baseUrl = createBaseUrl(options);
  const fetchImpl = options.fetchImpl ?? fetch;
  const url = new URL(`${baseUrl}/api/state`);
  if (options.sessionId) {
    url.searchParams.set("sessionId", options.sessionId);
  }

  const response = await fetchImpl(url);

  if (!response.ok) {
    const payload = await readErrorPayload(response);
    if (payload && typeof payload === "object" && "error" in payload) {
      throw new BridgeApiError(`Bridge request failed with status ${response.status}`, {
        status: response.status,
        code: typeof payload.error === "string" ? payload.error : null,
        details: payload
      });
    }

    throw new BridgeApiError(`Bridge request failed with status ${response.status}`, {
      status: response.status,
      details: payload
    });
  }

  return (await response.json()) as BoardStateSnapshot;
}

export async function loadBoardStateSync(
  options: LoadBoardStateSyncOptions = {}
): Promise<BoardStateSyncResult> {
  const baseUrl = createBaseUrl(options);
  const fetchImpl = options.fetchImpl ?? fetch;
  const url = new URL(`${baseUrl}/api/state/sync`);
  if (options.sessionId) {
    url.searchParams.set("sessionId", options.sessionId);
  }
  if (options.since) {
    url.searchParams.set("since", options.since);
  }

  const response = await fetchImpl(url);

  if (!response.ok) {
    const payload = await readErrorPayload(response);
    if (payload && typeof payload === "object" && "error" in payload) {
      throw new BridgeApiError(`Bridge request failed with status ${response.status}`, {
        status: response.status,
        code: typeof payload.error === "string" ? payload.error : null,
        details: payload
      });
    }

    throw new BridgeApiError(`Bridge request failed with status ${response.status}`, {
      status: response.status,
      details: payload
    });
  }

  return (await response.json()) as BoardStateSyncResult;
}

export async function loadManagedSessions(
  options: LoadManagedSessionsOptions = {}
): Promise<ManagedSessionListSnapshot> {
  const baseUrl = createBaseUrl(options);
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(new URL(`${baseUrl}/api/sessions`));

  if (!response.ok) {
    const payload = await readErrorPayload(response);
    throw new BridgeApiError(`Bridge request failed with status ${response.status}`, {
      status: response.status,
      details: payload
    });
  }

  return (await response.json()) as ManagedSessionListSnapshot;
}
