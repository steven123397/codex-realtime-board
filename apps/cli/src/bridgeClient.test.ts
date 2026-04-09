import assert from "node:assert/strict";
import test from "node:test";

import { createBridgeClient } from "./bridgeClient.js";

test("issues control requests against the bridge http api", async () => {
  const requests: Array<{ input: string; method: string }> = [];
  const client = createBridgeClient({
    baseUrl: "http://127.0.0.1:4317",
    fetchImpl: async (input, init) => {
      requests.push({
        input: String(input),
        method: init?.method ?? "GET"
      });

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "content-type": "application/json"
        }
      });
    }
  });

  await client.health();
  await client.listSessions();
  await client.startSession({
    cwd: "/workspace",
    prompt: "Summarize the workspace"
  });
  await client.attachSession({
    sessionId: "session_live"
  });

  assert.deepEqual(requests, [
    {
      input: "http://127.0.0.1:4317/healthz",
      method: "GET"
    },
    {
      input: "http://127.0.0.1:4317/api/sessions",
      method: "GET"
    },
    {
      input: "http://127.0.0.1:4317/api/session/start",
      method: "POST"
    },
    {
      input: "http://127.0.0.1:4317/api/session/attach",
      method: "POST"
    }
  ]);
});
