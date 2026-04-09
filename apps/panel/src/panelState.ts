import {
  PANEL_BRIDGE_URL_QUERY_PARAM,
  PANEL_SESSION_ID_QUERY_PARAM,
  type BoardStateSnapshot,
  type ContextSnapshot,
  type MemoryReferenceRecord,
  type OverviewSnapshot,
  type SearchSessionCard,
  type SessionSummary,
  type SkillActivationRecord,
  type ToolSessionCard
} from "@codex-realtime-board/shared";

import {
  BridgeApiError,
  loadBoardState,
  type LoadBoardStateOptions
} from "./api.js";

export type PanelSnapshotSource = "bridge" | "fallback" | "empty";

export interface PanelEmptyState {
  title: string;
  body: string;
}

export interface PanelSnapshot {
  board: BoardStateSnapshot;
  source: PanelSnapshotSource;
  errorMessage: string | null;
  emptyState: PanelEmptyState | null;
}

export interface LoadPanelSnapshotOptions extends LoadBoardStateOptions {
  fallbackState?: BoardStateSnapshot;
  loadBoardStateImpl?: (options: LoadBoardStateOptions) => Promise<BoardStateSnapshot>;
}

export interface PanelTarget {
  sessionId: string | null;
  baseUrl?: string;
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

function createZeroContext(): ContextSnapshot {
  return {
    usedTokens: 0,
    contextWindow: 0,
    remainingTokens: 0,
    recentCompactions: [],
    growthTrend: "steady",
    pressure: "low"
  };
}

function createEmptyBoardState(sessionId: string, title: string, status: SessionSummary["status"]): BoardStateSnapshot {
  const context = createZeroContext();
  return {
    session: {
      sessionId,
      title,
      status,
      lastActiveAt: new Date(0).toISOString(),
      isManaged: true
    },
    overview: {
      currentTool: null,
      currentPhase: "booting",
      contextBudget: context,
      pendingUserAction: null
    },
    tools: [],
    searches: [],
    skills: [],
    memories: [],
    context
  };
}

export function readPanelTargetFromSearch(search: string): PanelTarget {
  const params = new URLSearchParams(search);
  const sessionId = params.get(PANEL_SESSION_ID_QUERY_PARAM);
  const baseUrl = params.get(PANEL_BRIDGE_URL_QUERY_PARAM) ?? undefined;

  return {
    sessionId,
    baseUrl
  };
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

function createMissingSessionSnapshot(sessionId: string): PanelSnapshot {
  return {
    board: createEmptyBoardState(sessionId, "Session not found", "error"),
    source: "empty",
    errorMessage: `Managed session not found: ${sessionId}`,
    emptyState: {
      title: "Session not found",
      body: `Bridge does not currently expose a managed session with id \`${sessionId}\`. Re-run \`codex-board attach\` and pick a valid target.`
    }
  };
}

function createNoSelectionSnapshot(): PanelSnapshot {
  return {
    board: createEmptyBoardState("session_unselected", "No board-managed session selected", "idle"),
    source: "empty",
    errorMessage: null,
    emptyState: {
      title: "No session selected",
      body: "Bridge is reachable, but no managed session is selected yet. Run `codex-board start` or `codex-board attach <session-id>` first."
    }
  };
}

export async function loadPanelSnapshot(options: LoadPanelSnapshotOptions = {}): Promise<PanelSnapshot> {
  const { fallbackState = createDemoBoardState(), loadBoardStateImpl = loadBoardState, ...loadOptions } = options;

  try {
    const board = await loadBoardStateImpl(loadOptions);
    return {
      board,
      source: "bridge",
      errorMessage: null,
      emptyState: null
    };
  } catch (error) {
    if (error instanceof BridgeApiError && error.status === 404) {
      if (loadOptions.sessionId && error.code === "session_not_found") {
        return createMissingSessionSnapshot(loadOptions.sessionId);
      }

      return createNoSelectionSnapshot();
    }

    return {
      board: fallbackState,
      source: "fallback",
      errorMessage: normalizeError(error),
      emptyState: null
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
