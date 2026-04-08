import type {
  BoardStateSnapshot,
  ContextSnapshot,
  MemoryReferenceRecord,
  OverviewSnapshot,
  SearchSessionCard,
  SessionSummary,
  SkillActivationRecord,
  ToolSessionCard
} from "@codex-realtime-board/shared";

import { loadBoardState, type LoadBoardStateOptions } from "./api.js";

export type PanelSnapshotSource = "bridge" | "fallback";

export interface PanelSnapshot {
  board: BoardStateSnapshot;
  source: PanelSnapshotSource;
  errorMessage: string | null;
}

export interface LoadPanelSnapshotOptions extends LoadBoardStateOptions {
  fallbackState?: BoardStateSnapshot;
  loadBoardStateImpl?: (options: LoadBoardStateOptions) => Promise<BoardStateSnapshot>;
}

function minutesAgo(baseTime: Date, minutes: number): string {
  return new Date(baseTime.getTime() - minutes * 60_000).toISOString();
}

function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown bridge error";
}

export function createDemoBoardState(baseTime: Date = new Date()): BoardStateSnapshot {
  const session: SessionSummary = {
    sessionId: "session_local_demo",
    title: "Codex Realtime Board V1 bootstrap",
    status: "running",
    lastActiveAt: baseTime.toISOString(),
    isManaged: true
  };

  const context: ContextSnapshot = {
    usedTokens: 38240,
    contextWindow: 128000,
    remainingTokens: 89760,
    recentCompactions: [minutesAgo(baseTime, 48)],
    growthTrend: "rising",
    pressure: "low"
  };

  const overview: OverviewSnapshot = {
    currentTool: "webSearch",
    currentPhase: "planning",
    contextBudget: context,
    pendingUserAction: null
  };

  const tools: ToolSessionCard[] = [
    {
      toolKind: "webSearch",
      title: "Inspect app-server event surface",
      reason: "Map raw protocol events to board-level cards",
      summary: "Token usage, plan, item lifecycle, skills, search, and compact events are visible.",
      startedAt: minutesAgo(baseTime, 20),
      endedAt: minutesAgo(baseTime, 18),
      status: "completed"
    },
    {
      toolKind: "skill",
      title: "Bootstrap implementation plan",
      reason: "Lock the workspace shape before writing code",
      summary: "Create a workspace plan and align launcher, bridge, panel, and shared boundaries.",
      startedAt: minutesAgo(baseTime, 12),
      status: "active"
    }
  ];

  const searches: SearchSessionCard[] = [
    {
      query: "codex app-server structured events",
      actions: ["webSearch", "open docs", "compare event names"],
      summary: "A single search session rolls up page access and result synthesis.",
      inferredIndexing: false,
      startedAt: minutesAgo(baseTime, 22),
      status: "completed"
    }
  ];

  const skills: SkillActivationRecord[] = [
    {
      skillName: "brainstorming",
      source: "local skill registry",
      status: "completed",
      timestamp: minutesAgo(baseTime, 16)
    },
    {
      skillName: "writing-plans",
      source: "local skill registry",
      status: "completed",
      timestamp: minutesAgo(baseTime, 11)
    }
  ];

  const memories: MemoryReferenceRecord[] = [
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
  ];

  return {
    session,
    overview,
    tools,
    searches,
    skills,
    memories,
    context
  };
}

export async function loadPanelSnapshot(options: LoadPanelSnapshotOptions = {}): Promise<PanelSnapshot> {
  const { fallbackState = createDemoBoardState(), loadBoardStateImpl = loadBoardState, ...loadOptions } = options;

  try {
    const board = await loadBoardStateImpl(loadOptions);
    return {
      board,
      source: "bridge",
      errorMessage: null
    };
  } catch (error) {
    return {
      board: fallbackState,
      source: "fallback",
      errorMessage: normalizeError(error)
    };
  }
}

export function buildOverviewTimeline(board: BoardStateSnapshot): string[] {
  const items: string[] = [];

  if (board.overview.pendingUserAction) {
    items.push(`Attention: ${board.overview.pendingUserAction.label}`);
  } else {
    items.push(
      `Phase watch: ${board.overview.currentPhase}${board.overview.currentTool ? ` via ${board.overview.currentTool}` : ""}`
    );
  }

  if (board.tools[0]) {
    items.push(`Tool pulse: ${board.tools[0].title} - ${board.tools[0].summary}`);
  }

  if (board.searches[0]) {
    items.push(`Search pulse: ${board.searches[0].query}`);
  }

  items.push(
    `Context runway: ${board.context.remainingTokens} of ${board.context.contextWindow} tokens remaining`
  );

  while (items.length < 4) {
    items.push(`Session watch: ${board.session.status} - ${board.session.title}`);
  }

  return items.slice(0, 4);
}
