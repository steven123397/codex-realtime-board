import {
  createServer,
  type IncomingMessage,
  type ServerResponse
} from "node:http";
import type { AddressInfo } from "node:net";

import type {
  AttachSessionRequest,
  AttachSessionResult,
  BoardStateSnapshot,
  BoardStateSyncResult,
  BridgeHealthSnapshot,
  ManagedSessionListSnapshot,
  StartSessionRequest,
  StartSessionResult
} from "@codex-realtime-board/shared";

export interface BridgeHttpServerOptions {
  host?: string;
  port: number;
  getHealth(): BridgeHealthSnapshot;
  getState(sessionId?: string | null): BoardStateSnapshot | null;
  getStateSync?(sessionId?: string | null, since?: string | null): BoardStateSyncResult | null;
  listSessions?(): ManagedSessionListSnapshot;
  startSession?(request: StartSessionRequest): Promise<StartSessionResult>;
  attachSession?(request: AttachSessionRequest): Promise<AttachSessionResult>;
}

export interface BridgeHttpServer {
  baseUrl: string;
  close(): Promise<void>;
}

function writeJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, {
    "access-control-allow-origin": "*",
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

async function readJsonBody<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) {
    return {} as T;
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
}

export async function createBridgeHttpServer(options: BridgeHttpServerOptions): Promise<BridgeHttpServer> {
  const host = options.host ?? "127.0.0.1";
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `${host}:${options.port}`}`);

    if (request.method === "GET" && (url.pathname === "/healthz" || url.pathname === "/readyz")) {
      writeJson(response, 200, options.getHealth());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/sessions" && options.listSessions) {
      writeJson(response, 200, options.listSessions());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/state/sync" && options.getStateSync) {
      const sessionId = url.searchParams.get("sessionId");
      const since = url.searchParams.get("since");
      const result = options.getStateSync(sessionId, since);
      if (!result) {
        writeJson(response, 404, {
          error: "session_not_found",
          sessionId
        });
        return;
      }

      writeJson(response, 200, result);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/state") {
      const sessionId = url.searchParams.get("sessionId");
      const snapshot = options.getState(sessionId);
      if (!snapshot) {
        writeJson(response, 404, {
          error: "session_not_found",
          sessionId
        });
        return;
      }

      writeJson(response, 200, snapshot);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/session/start" && options.startSession) {
      const payload = await readJsonBody<StartSessionRequest>(request);
      writeJson(response, 200, await options.startSession(payload));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/session/attach" && options.attachSession) {
      const payload = await readJsonBody<AttachSessionRequest>(request);
      writeJson(response, 200, await options.attachSession(payload));
      return;
    }

    writeJson(response, 404, {
      error: "not_found",
      path: url.pathname
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Unable to determine bridge http server address");
  }

  const { port } = address as AddressInfo;
  return {
    baseUrl: `http://${host}:${port}`,
    close() {
      return new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
  };
}
