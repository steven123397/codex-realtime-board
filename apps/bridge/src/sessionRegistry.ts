import {
  partitionManagedSessions,
  type BoardStateSyncResult,
  type ManagedSessionListSnapshot,
  type ManagedSessionSummary
} from "@codex-realtime-board/shared";
import type { BoardStateSnapshot } from "@codex-realtime-board/shared";

export interface UpsertStateOptions {
  select?: boolean;
}

export interface SessionRegistry {
  upsertState(snapshot: BoardStateSnapshot, options?: UpsertStateOptions): ManagedSessionSummary;
  listSessions(): ManagedSessionListSnapshot;
  selectSession(sessionId: string): ManagedSessionSummary | null;
  getSession(sessionId: string): ManagedSessionSummary | null;
  getState(sessionId?: string | null): BoardStateSnapshot | null;
  getStateSync(sessionId?: string | null, since?: string | null): BoardStateSyncResult | null;
}

interface SessionRecord {
  summary: ManagedSessionSummary;
  state: BoardStateSnapshot;
  cursor: string;
}

function toSummary(snapshot: BoardStateSnapshot): ManagedSessionSummary {
  return {
    ...snapshot.session,
    canResume: snapshot.session.isManaged
  };
}

export function createSessionRegistry(): SessionRegistry {
  const sessions = new Map<string, SessionRecord>();
  let selectedSessionId: string | null = null;
  let nextCursorNumber = 1;

  function createCursor(): string {
    return `cursor_${String(nextCursorNumber++).padStart(6, "0")}`;
  }

  function getPartition(selectedOverride: string | null = selectedSessionId): ManagedSessionListSnapshot {
    const summaries = Array.from(sessions.values(), (record) => record.summary);
    return partitionManagedSessions(summaries, selectedOverride);
  }

  function getEffectiveSelectedSessionId(): string | null {
    if (selectedSessionId && sessions.has(selectedSessionId)) {
      return selectedSessionId;
    }

    const snapshot = getPartition(null);
    return snapshot.active[0]?.sessionId ?? snapshot.recent[0]?.sessionId ?? null;
  }

  return {
    upsertState(snapshot, options = {}) {
      const record: SessionRecord = {
        summary: toSummary(snapshot),
        state: structuredClone(snapshot),
        cursor: createCursor()
      };

      sessions.set(snapshot.session.sessionId, record);
      if (options.select) {
        selectedSessionId = snapshot.session.sessionId;
      }

      return record.summary;
    },
    listSessions() {
      return getPartition(getEffectiveSelectedSessionId());
    },
    selectSession(sessionId) {
      const record = sessions.get(sessionId);
      if (!record) {
        return null;
      }

      selectedSessionId = sessionId;
      return record.summary;
    },
    getSession(sessionId) {
      return sessions.get(sessionId)?.summary ?? null;
    },
    getState(sessionId = null) {
      const targetSessionId = sessionId ?? getEffectiveSelectedSessionId();
      if (!targetSessionId) {
        return null;
      }

      const record = sessions.get(targetSessionId);
      return record ? structuredClone(record.state) : null;
    },
    getStateSync(sessionId = null, since = null) {
      const targetSessionId = sessionId ?? getEffectiveSelectedSessionId();
      if (!targetSessionId) {
        return null;
      }

      const record = sessions.get(targetSessionId);
      if (!record) {
        return null;
      }

      if (since && since === record.cursor) {
        return {
          kind: "unchanged",
          cursor: record.cursor
        };
      }

      return {
        kind: "snapshot",
        cursor: record.cursor,
        snapshot: structuredClone(record.state)
      };
    }
  };
}
