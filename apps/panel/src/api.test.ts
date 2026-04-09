import assert from "node:assert/strict";
import test from "node:test";

import { BridgeApiError, loadBoardState } from "./api.js";

test("loads board state from bridge api", async () => {
  const expected = {
    session: { sessionId: "thread_panel" }
  };

  const state = await loadBoardState({
    baseUrl: "http://127.0.0.1:4317",
    sessionId: "thread_panel",
    fetchImpl: async (input) => {
      assert.equal(String(input), "http://127.0.0.1:4317/api/state?sessionId=thread_panel");
      return new Response(JSON.stringify(expected), {
        status: 200,
        headers: {
          "content-type": "application/json"
        }
      });
    }
  });

  assert.deepEqual(state, expected);
});

test("throws when bridge api responds with an error", async () => {
  await assert.rejects(() =>
    loadBoardState({
      baseUrl: "http://127.0.0.1:4317",
      fetchImpl: async () => new Response("boom", { status: 500 })
    })
  );
});

test("throws a typed bridge api error for structured 404 responses", async () => {
  await assert.rejects(
    () =>
      loadBoardState({
        baseUrl: "http://127.0.0.1:4317",
        sessionId: "missing_session",
        fetchImpl: async () =>
          new Response(
            JSON.stringify({
              error: "session_not_found",
              sessionId: "missing_session"
            }),
            {
              status: 404,
              headers: {
                "content-type": "application/json"
              }
            }
          )
      }),
    (error: unknown) => {
      assert.ok(error instanceof BridgeApiError);
      assert.equal(error.status, 404);
      assert.equal(error.code, "session_not_found");
      return true;
    }
  );
});
