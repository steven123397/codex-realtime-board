import assert from "node:assert/strict";
import test from "node:test";

import { createAppServerClient, type AppServerTransport } from "./appServerClient.js";
import type { AppServerNotificationMessage } from "./appServerProtocol.js";

class FakeTransport implements AppServerTransport {
  readonly sent: string[] = [];
  #messageListeners = new Set<(message: string) => void>();
  #closeListeners = new Set<(code: number, reason: string) => void>();
  #errorListeners = new Set<(error: unknown) => void>();

  send(message: string): void {
    this.sent.push(message);
  }

  close(code = 1000, reason = "closed"): void {
    for (const listener of this.#closeListeners) {
      listener(code, reason);
    }
  }

  onMessage(listener: (message: string) => void): () => void {
    this.#messageListeners.add(listener);
    return () => this.#messageListeners.delete(listener);
  }

  onClose(listener: (code: number, reason: string) => void): () => void {
    this.#closeListeners.add(listener);
    return () => this.#closeListeners.delete(listener);
  }

  onError(listener: (error: unknown) => void): () => void {
    this.#errorListeners.add(listener);
    return () => this.#errorListeners.delete(listener);
  }

  emitJson(message: unknown): void {
    const payload = JSON.stringify(message);
    for (const listener of this.#messageListeners) {
      listener(payload);
    }
  }

  emitError(error: unknown): void {
    for (const listener of this.#errorListeners) {
      listener(error);
    }
  }
}

test("resolves initialize requests from transport responses", async () => {
  const transport = new FakeTransport();
  const client = createAppServerClient(transport);

  const initializePromise = client.initialize({
    name: "codex-realtime-board-test",
    version: "0.0.0"
  });

  assert.equal(transport.sent.length, 1);

  const request = JSON.parse(transport.sent[0] ?? "{}");
  assert.equal(request.method, "initialize");
  assert.equal(request.params.clientInfo.name, "codex-realtime-board-test");

  transport.emitJson({
    id: request.id,
    result: {
      userAgent: "codex-realtime-board-test/0.0.0",
      codexHome: "/tmp/codex-home",
      platformFamily: "unix",
      platformOs: "linux"
    }
  });

  await assert.doesNotReject(initializePromise);
});

test("forwards server notifications to subscribers", async () => {
  const transport = new FakeTransport();
  const client = createAppServerClient(transport);
  const seen: AppServerNotificationMessage[] = [];

  const dispose = client.onNotification((notification) => {
    seen.push(notification);
  });

  transport.emitJson({
    method: "thread/tokenUsage/updated",
    params: {
      threadId: "thread_live",
      turnId: "turn_live",
      tokenUsage: {
        total: {
          totalTokens: 1200,
          inputTokens: 700,
          cachedInputTokens: 50,
          outputTokens: 500,
          reasoningOutputTokens: 100
        },
        last: {
          totalTokens: 500,
          inputTokens: 300,
          cachedInputTokens: 20,
          outputTokens: 200,
          reasoningOutputTokens: 30
        },
        modelContextWindow: 128000
      }
    }
  });

  assert.equal(seen.length, 1);
  assert.equal(seen[0]?.method, "thread/tokenUsage/updated");

  dispose();
  transport.emitJson({ method: "skills/changed", params: {} });
  assert.equal(seen.length, 1);
});
