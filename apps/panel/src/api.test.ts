import assert from "node:assert/strict";
import test from "node:test";

import { loadBoardState } from "./api.js";

test("loads board state from bridge api", async () => {
  const expected = {
    session: { sessionId: "thread_panel" }
  };

  const state = await loadBoardState({
    baseUrl: "http://127.0.0.1:4317",
    fetchImpl: async (input) => {
      assert.equal(String(input), "http://127.0.0.1:4317/api/state");
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
