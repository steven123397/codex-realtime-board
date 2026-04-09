export const V1_PRIMARY_TABS = [
  "Overview",
  "Tools",
  "Search",
  "Skills",
  "Memories",
  "Context"
] as const;

export type V1PrimaryTab = (typeof V1_PRIMARY_TABS)[number];
export type SessionStatus = "idle" | "running" | "waiting-user" | "completed" | "error";
export type ToolKind = "shell" | "webSearch" | "mcp" | "skill" | "fileSearch" | "memory";
export type PhaseKind =
  | "booting"
  | "planning"
  | "searching"
  | "executing"
  | "editing"
  | "waiting-input"
  | "completed"
  | "error";
export type RecordStatus = "active" | "completed" | "failed" | "inferred";
export type PendingUserActionKind = "input" | "approval" | "error";
export type ContextPressure = "low" | "medium" | "high";
export type ContextGrowthTrend = "steady" | "rising" | "spiking";

export interface SessionSummary {
  sessionId: string;
  title: string;
  status: SessionStatus;
  lastActiveAt: string;
  isManaged: boolean;
}

export interface ContextSnapshot {
  usedTokens: number;
  contextWindow: number;
  remainingTokens: number;
  recentCompactions: string[];
  growthTrend: ContextGrowthTrend;
  pressure: ContextPressure;
}

export interface PendingUserAction {
  kind: PendingUserActionKind;
  label: string;
}

export interface OverviewSnapshot {
  currentTool: ToolKind | null;
  currentPhase: PhaseKind;
  contextBudget: ContextSnapshot;
  pendingUserAction: PendingUserAction | null;
}

export interface ToolSessionCard {
  toolKind: ToolKind;
  title: string;
  reason: string;
  summary: string;
  startedAt: string;
  endedAt?: string;
  status: RecordStatus;
}

export interface SearchSessionCard {
  query: string;
  actions: string[];
  summary: string;
  inferredIndexing: boolean;
  startedAt: string;
  status: RecordStatus;
}

export interface SkillActivationRecord {
  skillName: string;
  source: string;
  status: RecordStatus;
  timestamp: string;
}

export interface MemoryReferenceEntry {
  title: string;
  excerpt: string;
}

export interface MemoryReferenceRecord {
  sourceThreadId: string;
  entries: MemoryReferenceEntry[];
  usedByTurnId: string;
}

export interface BoardStateSnapshot {
  session: SessionSummary;
  overview: OverviewSnapshot;
  tools: ToolSessionCard[];
  searches: SearchSessionCard[];
  skills: SkillActivationRecord[];
  memories: MemoryReferenceRecord[];
  context: ContextSnapshot;
}

export interface BoardStateSyncSnapshotResult {
  kind: "snapshot";
  cursor: string;
  snapshot: BoardStateSnapshot;
}

export interface BoardStateSyncUnchangedResult {
  kind: "unchanged";
  cursor: string;
}

export type BoardStateQueryErrorCode = "session_not_found" | "no_session_selected";

export interface BoardStateQueryErrorResponse {
  error: BoardStateQueryErrorCode;
  sessionId: string | null;
}

export type BoardStateSyncResult = BoardStateSyncSnapshotResult | BoardStateSyncUnchangedResult;

export type BridgeMode = "mock" | "live";

export interface BridgeHealthSnapshot {
  ok: true;
  mode: BridgeMode;
  message: string;
}
