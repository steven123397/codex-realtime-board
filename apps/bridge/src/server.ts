import type {
  AttachSessionRequest,
  AttachSessionResult,
  BoardStateSnapshot,
  BoardStateSyncResult,
  BridgeHealthSnapshot,
  ContextSnapshot,
  ManagedSessionListSnapshot,
  StartSessionRequest,
  StartSessionResult
} from "@codex-realtime-board/shared";

import { createBridgeControlApi } from "./controlApi.js";
import { createSessionRegistry } from "./sessionRegistry.js";

export interface BridgeServer {
  getHealth(): BridgeHealthSnapshot;
  getState(sessionId?: string | null): BoardStateSnapshot | null;
  getStateSync(sessionId?: string | null, since?: string | null): BoardStateSyncResult | null;
  listSessions(): ManagedSessionListSnapshot;
  startSession(request: StartSessionRequest): Promise<StartSessionResult>;
  attachSession(request: AttachSessionRequest): Promise<AttachSessionResult>;
}

function minutesAgo(baseTime: Date, minutes: number): string {
  return new Date(baseTime.getTime() - minutes * 60_000).toISOString();
}

function createMockState(sessionId: string, title: string, at: Date): BoardStateSnapshot {
  const context: ContextSnapshot = {
    usedTokens: 38240,
    contextWindow: 128000,
    remainingTokens: 89760,
    recentCompactions: [minutesAgo(at, 48)],
    growthTrend: "rising",
    pressure: "low"
  };

  return {
    session: {
      sessionId,
      title,
      status: "running",
      lastActiveAt: at.toISOString(),
      isManaged: true
    },
    overview: {
      currentTool: "webSearch",
      currentPhase: "planning",
      contextBudget: context,
      pendingUserAction: null
    },
    tools: [
      {
        toolKind: "webSearch",
        title: "Inspect app-server event surface",
        reason: "Verify which structured events can power the board",
        summary: "Confirmed token usage, plan, item lifecycle, skills, search, and compact events.",
        startedAt: minutesAgo(at, 20),
        endedAt: minutesAgo(at, 18),
        status: "completed"
      }
    ],
    searches: [
      {
        query: "codex app-server structured events",
        actions: ["webSearch", "open docs", "compare event names"],
        summary: "Search session grouped into a single card for the panel.",
        inferredIndexing: false,
        startedAt: minutesAgo(at, 22),
        status: "completed"
      }
    ],
    skills: [
      {
        skillName: "writing-plans",
        source: "local skill registry",
        status: "completed",
        timestamp: minutesAgo(at, 15)
      }
    ],
    memories: [
      {
        sourceThreadId: "thread_bootstrap",
        entries: [
          {
            title: "V1 information priority",
            excerpt: "Tools first, process state second, context budget third."
          }
        ],
        usedByTurnId: "turn_bootstrap"
      }
    ],
    context
  };
}

export function createMockBridgeServer(baseTime: Date = new Date()): BridgeServer {
  const registry = createSessionRegistry();
  const panelBaseUrl = process.env.CODEX_BOARD_PANEL_URL ?? "http://127.0.0.1:5173";
  const bridgeBaseUrl = process.env.CODEX_BRIDGE_BASE_URL ?? "http://127.0.0.1:4317";
  let nextMockSessionNumber = 1;

  registry.upsertState(createMockState("session_local_demo", "Codex Realtime Board V1 bootstrap", baseTime), {
    select: true
  });

  const controlApi = createBridgeControlApi({
    registry,
    getBridgeBaseUrl: () => bridgeBaseUrl,
    getPanelBaseUrl: () => panelBaseUrl,
    async startSession(request) {
      const sessionId = `session_mock_${String(nextMockSessionNumber++).padStart(3, "0")}`;
      const at = new Date(baseTime.getTime() + nextMockSessionNumber * 60_000);
      return createMockState(sessionId, request.title ?? "Mock managed session", at);
    }
  });

  return {
    getHealth() {
      return {
        ok: true,
        mode: "mock",
        message: "Bridge skeleton is alive and serving mock board data."
      };
    },
    getState(sessionId) {
      return controlApi.getState(sessionId);
    },
    getStateSync(sessionId, since) {
      return controlApi.getStateSync(sessionId, since);
    },
    listSessions() {
      return controlApi.listSessions();
    },
    startSession(request) {
      return controlApi.startSession(request);
    },
    attachSession(request) {
      return controlApi.attachSession(request);
    }
  };
}
