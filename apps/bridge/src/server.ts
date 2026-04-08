import type {
  BoardStateSnapshot,
  BridgeHealthSnapshot,
  ContextSnapshot
} from "@codex-realtime-board/shared";

export interface BridgeServer {
  getHealth(): BridgeHealthSnapshot;
  getState(): BoardStateSnapshot;
}

function minutesAgo(baseTime: Date, minutes: number): string {
  return new Date(baseTime.getTime() - minutes * 60_000).toISOString();
}

export function createMockBridgeServer(baseTime: Date = new Date()): BridgeServer {
  const context: ContextSnapshot = {
    usedTokens: 38240,
    contextWindow: 128000,
    remainingTokens: 89760,
    recentCompactions: [minutesAgo(baseTime, 48)],
    growthTrend: "rising",
    pressure: "low"
  };

  const state: BoardStateSnapshot = {
    session: {
      sessionId: "session_local_demo",
      title: "Codex Realtime Board V1 bootstrap",
      status: "running",
      lastActiveAt: baseTime.toISOString(),
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
        startedAt: minutesAgo(baseTime, 20),
        endedAt: minutesAgo(baseTime, 18),
        status: "completed"
      }
    ],
    searches: [
      {
        query: "codex app-server structured events",
        actions: ["webSearch", "open docs", "compare event names"],
        summary: "Search session grouped into a single card for the panel.",
        inferredIndexing: false,
        startedAt: minutesAgo(baseTime, 22),
        status: "completed"
      }
    ],
    skills: [
      {
        skillName: "writing-plans",
        source: "local skill registry",
        status: "completed",
        timestamp: minutesAgo(baseTime, 15)
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

  return {
    getHealth() {
      return {
        ok: true,
        mode: "mock",
        message: "Bridge skeleton is alive and serving mock board data."
      };
    },
    getState() {
      return state;
    }
  };
}
