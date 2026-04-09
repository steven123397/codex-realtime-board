import {
  PANEL_BRIDGE_URL_QUERY_PARAM,
  PANEL_SESSION_ID_QUERY_PARAM,
  type BoardStateSnapshot,
  type ContextSnapshot,
  type ManagedSessionListSnapshot,
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
  loadManagedSessions,
  type LoadBoardStateOptions,
  type LoadManagedSessionsOptions
} from "./api.js";

export type PanelSnapshotSource = "bridge" | "fallback" | "empty";
export type PanelConnectionState = "live" | "stale" | "fallback" | "empty";

export interface PanelEmptyState {
  title: string;
  body: string;
}

export interface PanelSnapshot {
  board: BoardStateSnapshot;
  source: PanelSnapshotSource;
  connectionState: PanelConnectionState;
  errorMessage: string | null;
  emptyState: PanelEmptyState | null;
  loadedAt: string;
  staleSince: string | null;
  lastLiveAt: string | null;
  refreshFailures: number;
  sessions: ManagedSessionListSnapshot | null;
  sessionDirectoryError: string | null;
}

export interface LoadPanelSnapshotOptions extends LoadBoardStateOptions {
  fallbackState?: BoardStateSnapshot;
  loadBoardStateImpl?: (options: LoadBoardStateOptions) => Promise<BoardStateSnapshot>;
  loadSessionsImpl?: (options: LoadManagedSessionsOptions) => Promise<ManagedSessionListSnapshot>;
  previousSnapshot?: PanelSnapshot | null;
}

export interface PanelTarget {
  sessionId: string | null;
  baseUrl?: string;
}

export interface PanelPollerOptions {
  loadSnapshot: (context: { previousSnapshot: PanelSnapshot | null }) => Promise<PanelSnapshot>;
  onSnapshot: (snapshot: PanelSnapshot) => void;
  onLoadingChange?: (loading: boolean) => void;
  onRefreshingChange?: (refreshing: boolean) => void;
  intervalMs?: number;
  scheduleRefresh?: (callback: () => void, delay: number) => unknown;
  clearScheduledRefresh?: (timerId: unknown) => void;
}

export interface PanelPoller {
  start: () => Promise<void>;
  refresh: () => Promise<void>;
  stop: () => void;
}

export const PANEL_AUTO_REFRESH_INTERVAL_MS = 5_000;

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

function createLoadedAt(): string {
  return new Date().toISOString();
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

export function buildPanelTargetSearch(search: string, target: PanelTarget): string {
  const params = new URLSearchParams(search);

  if (target.sessionId) {
    params.set(PANEL_SESSION_ID_QUERY_PARAM, target.sessionId);
  } else {
    params.delete(PANEL_SESSION_ID_QUERY_PARAM);
  }

  if (target.baseUrl) {
    params.set(PANEL_BRIDGE_URL_QUERY_PARAM, target.baseUrl);
  } else {
    params.delete(PANEL_BRIDGE_URL_QUERY_PARAM);
  }

  const serialized = params.toString();
  return serialized.length > 0 ? `?${serialized}` : "";
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

function hasPreviousLiveSnapshot(snapshot: PanelSnapshot | null | undefined): snapshot is PanelSnapshot {
  return Boolean(snapshot && snapshot.source === "bridge" && snapshot.lastLiveAt);
}

function createPanelSnapshot(
  board: BoardStateSnapshot,
  options: {
    source: PanelSnapshotSource;
    connectionState: PanelConnectionState;
    loadedAt: string;
    errorMessage?: string | null;
    emptyState?: PanelEmptyState | null;
    staleSince?: string | null;
    lastLiveAt?: string | null;
    refreshFailures?: number;
    sessions?: ManagedSessionListSnapshot | null;
    sessionDirectoryError?: string | null;
  }
): PanelSnapshot {
  return {
    board,
    source: options.source,
    connectionState: options.connectionState,
    errorMessage: options.errorMessage ?? null,
    emptyState: options.emptyState ?? null,
    loadedAt: options.loadedAt,
    staleSince: options.staleSince ?? null,
    lastLiveAt: options.lastLiveAt ?? null,
    refreshFailures: options.refreshFailures ?? 0,
    sessions: options.sessions ?? null,
    sessionDirectoryError: options.sessionDirectoryError ?? null
  };
}

function resolveSessionsResult(
  result: PromiseSettledResult<ManagedSessionListSnapshot>,
  previousSnapshot: PanelSnapshot | null | undefined
): {
  sessions: ManagedSessionListSnapshot | null;
  sessionDirectoryError: string | null;
} {
  if (result.status === "fulfilled") {
    return {
      sessions: result.value,
      sessionDirectoryError: null
    };
  }

  return {
    sessions: previousSnapshot?.sessions ?? null,
    sessionDirectoryError: normalizeError(result.reason)
  };
}

function createMissingSessionSnapshot(
  sessionId: string,
  loadedAt: string,
  sessions: ManagedSessionListSnapshot | null,
  sessionDirectoryError: string | null
): PanelSnapshot {
  return {
    board: createEmptyBoardState(sessionId, "Session not found", "error"),
    source: "empty",
    connectionState: "empty",
    errorMessage: `Managed session not found: ${sessionId}`,
    emptyState: {
      title: "Session not found",
      body: `Bridge does not currently expose a managed session with id \`${sessionId}\`. Re-run \`codex-board attach\` and pick a valid target.`
    },
    loadedAt,
    staleSince: null,
    lastLiveAt: null,
    refreshFailures: 0,
    sessions,
    sessionDirectoryError
  };
}

function createNoSelectionSnapshot(
  loadedAt: string,
  sessions: ManagedSessionListSnapshot | null,
  sessionDirectoryError: string | null
): PanelSnapshot {
  return {
    board: createEmptyBoardState("session_unselected", "No board-managed session selected", "idle"),
    source: "empty",
    connectionState: "empty",
    errorMessage: null,
    emptyState: {
      title: "No session selected",
      body: "Bridge is reachable, but no managed session is selected yet. Run `codex-board start` or `codex-board attach <session-id>` first."
    },
    loadedAt,
    staleSince: null,
    lastLiveAt: null,
    refreshFailures: 0,
    sessions,
    sessionDirectoryError
  };
}

export async function loadPanelSnapshot(options: LoadPanelSnapshotOptions = {}): Promise<PanelSnapshot> {
  const {
    fallbackState = createDemoBoardState(),
    loadBoardStateImpl = loadBoardState,
    loadSessionsImpl = loadManagedSessions,
    previousSnapshot = null,
    ...loadOptions
  } = options;
  const loadedAt = createLoadedAt();
  const [boardResult, sessionsResult] = await Promise.allSettled([
    loadBoardStateImpl(loadOptions),
    loadSessionsImpl({
      baseUrl: loadOptions.baseUrl
    })
  ]);
  const { sessions, sessionDirectoryError } = resolveSessionsResult(sessionsResult, previousSnapshot);

  if (boardResult.status === "fulfilled") {
    return createPanelSnapshot(boardResult.value, {
      source: "bridge",
      connectionState: "live",
      loadedAt,
      lastLiveAt: loadedAt,
      sessions,
      sessionDirectoryError
    });
  }

  const error = boardResult.reason;

  if (error instanceof BridgeApiError && error.status === 404) {
    if (loadOptions.sessionId && error.code === "session_not_found") {
      return createMissingSessionSnapshot(loadOptions.sessionId, loadedAt, sessions, sessionDirectoryError);
    }

    return createNoSelectionSnapshot(loadedAt, sessions, sessionDirectoryError);
  }

  if (hasPreviousLiveSnapshot(previousSnapshot)) {
    return createPanelSnapshot(previousSnapshot.board, {
      source: "bridge",
      connectionState: "stale",
      loadedAt: previousSnapshot.loadedAt,
      errorMessage: normalizeError(error),
      staleSince: previousSnapshot.staleSince ?? loadedAt,
      lastLiveAt: previousSnapshot.lastLiveAt,
      refreshFailures: previousSnapshot.refreshFailures + 1,
      sessions: sessions ?? previousSnapshot.sessions,
      sessionDirectoryError
    });
  }

  return createPanelSnapshot(fallbackState, {
    source: "fallback",
    connectionState: "fallback",
    loadedAt,
    errorMessage: normalizeError(error),
    sessions,
    sessionDirectoryError
  });
}

export function createPanelPoller(options: PanelPollerOptions): PanelPoller {
  const intervalMs = options.intervalMs ?? PANEL_AUTO_REFRESH_INTERVAL_MS;
  const scheduleRefresh = options.scheduleRefresh ?? ((callback: () => void, delay: number) => window.setTimeout(callback, delay));
  const clearScheduledRefresh = options.clearScheduledRefresh ?? ((timerId: unknown) => window.clearTimeout(timerId as number));

  let stopped = false;
  let initialized = false;
  let activeRun: Promise<void> | null = null;
  let pendingTimerId: unknown = null;
  let lastSnapshot: PanelSnapshot | null = null;

  function clearPendingTimer(): void {
    if (pendingTimerId === null) {
      return;
    }

    clearScheduledRefresh(pendingTimerId);
    pendingTimerId = null;
  }

  function scheduleNextRun(): void {
    if (stopped) {
      return;
    }

    clearPendingTimer();
    pendingTimerId = scheduleRefresh(() => {
      void runCycle();
    }, intervalMs);
  }

  async function runCycle(): Promise<void> {
    if (stopped) {
      return;
    }

    if (activeRun) {
      return activeRun;
    }

    clearPendingTimer();

    const isInitialLoad = !initialized;
    if (isInitialLoad) {
      options.onLoadingChange?.(true);
    } else {
      options.onRefreshingChange?.(true);
    }

    activeRun = (async () => {
      try {
        const snapshot = await options.loadSnapshot({
          previousSnapshot: lastSnapshot
        });
        if (stopped) {
          return;
        }

        options.onSnapshot(snapshot);
        lastSnapshot = snapshot;
        initialized = true;
      } finally {
        activeRun = null;

        if (stopped) {
          return;
        }

        if (isInitialLoad) {
          options.onLoadingChange?.(false);
        } else {
          options.onRefreshingChange?.(false);
        }

        scheduleNextRun();
      }
    })();

    return activeRun;
  }

  return {
    start: runCycle,
    refresh: runCycle,
    stop() {
      stopped = true;
      clearPendingTimer();
    }
  };
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
