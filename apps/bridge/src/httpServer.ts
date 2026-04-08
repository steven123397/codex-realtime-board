import { createServer, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

import type { BoardStateSnapshot, BridgeHealthSnapshot } from "@codex-realtime-board/shared";

export interface BridgeHttpServerOptions {
  host?: string;
  port: number;
  getHealth(): BridgeHealthSnapshot;
  getState(): BoardStateSnapshot;
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

export async function createBridgeHttpServer(options: BridgeHttpServerOptions): Promise<BridgeHttpServer> {
  const host = options.host ?? "127.0.0.1";
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `${host}:${options.port}`}`);

    if (request.method === "GET" && (url.pathname === "/healthz" || url.pathname === "/readyz")) {
      writeJson(response, 200, options.getHealth());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/state") {
      writeJson(response, 200, options.getState());
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
