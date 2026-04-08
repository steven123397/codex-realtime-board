import { createMockBridgeServer } from "./server.js";

const bridge = createMockBridgeServer();
const health = bridge.getHealth();
const snapshot = bridge.getState();

console.log([
  `[bridge] ${health.message}`,
  `[bridge] session=${snapshot.session.sessionId}`,
  `[bridge] phase=${snapshot.overview.currentPhase}`,
  `[bridge] tool=${snapshot.overview.currentTool ?? "idle"}`
].join("\n"));
