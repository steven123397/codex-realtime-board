import type { SessionStatus, SessionSummary } from "./contracts.js";

export const PANEL_SESSION_ID_QUERY_PARAM = "sessionId";
export const PANEL_BRIDGE_URL_QUERY_PARAM = "bridgeUrl";

export interface ManagedSessionSummary extends SessionSummary {
  canResume: boolean;
}

export interface ManagedSessionListSnapshot {
  active: ManagedSessionSummary[];
  recent: ManagedSessionSummary[];
  selectedSessionId: string | null;
}

export interface StartSessionRequest {
  cwd?: string | null;
  prompt?: string | null;
  title?: string | null;
}

export interface StartSessionResult {
  session: ManagedSessionSummary;
  sessions: ManagedSessionListSnapshot;
  panelUrl: string;
}

export interface AttachSessionRequest {
  sessionId?: string | null;
}

export type AttachSessionResolution = "attached" | "selection-required" | "not-found" | "no-sessions";

export interface AttachSessionResult {
  resolution: AttachSessionResolution;
  session: ManagedSessionSummary | null;
  sessions: ManagedSessionListSnapshot;
  panelUrl: string | null;
}

export function isManagedSessionActive(status: SessionStatus): boolean {
  return status === "running" || status === "waiting-user";
}

function compareByLastActive(a: ManagedSessionSummary, b: ManagedSessionSummary): number {
  return Date.parse(b.lastActiveAt) - Date.parse(a.lastActiveAt);
}

export function partitionManagedSessions(
  sessions: readonly ManagedSessionSummary[],
  selectedSessionId: string | null = null
): ManagedSessionListSnapshot {
  const active: ManagedSessionSummary[] = [];
  const recent: ManagedSessionSummary[] = [];

  for (const session of sessions) {
    if (isManagedSessionActive(session.status)) {
      active.push(session);
      continue;
    }

    recent.push(session);
  }

  active.sort(compareByLastActive);
  recent.sort(compareByLastActive);

  return {
    active,
    recent,
    selectedSessionId
  };
}
