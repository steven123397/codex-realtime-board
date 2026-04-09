import assert from "node:assert/strict";
import test from "node:test";

import { createMockBridgeServer } from "./server.js";

test("mock bridge runtime starts and attaches managed sessions", async () => {
  const bridge = createMockBridgeServer(new Date("2026-04-09T12:00:00.000Z"));

  const initialSessions = bridge.listSessions();
  assert.equal(initialSessions.active.length, 1);
  assert.equal(initialSessions.selectedSessionId, "session_local_demo");

  const started = await bridge.startSession({
    title: "New mock session"
  });
  assert.equal(started.session.title, "New mock session");

  const attached = await bridge.attachSession({
    sessionId: started.session.sessionId
  });
  assert.equal(attached.resolution, "attached");
  assert.equal(bridge.getState()?.session.sessionId, started.session.sessionId);
});
