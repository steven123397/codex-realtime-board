import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import type { ManagedSessionListSnapshot, ManagedSessionSummary } from "@codex-realtime-board/shared";

export interface SessionSelection {
  session: ManagedSessionSummary | null;
  error: string | null;
}

function formatSessionLine(index: number, session: ManagedSessionSummary): string {
  return `${index}. ${session.sessionId} | ${session.title} | ${session.status} | ${session.lastActiveAt}`;
}

function getSelectableSessions(snapshot: ManagedSessionListSnapshot): ManagedSessionSummary[] {
  return [...snapshot.active, ...snapshot.recent];
}

export function renderSessionSelection(snapshot: ManagedSessionListSnapshot): string {
  const lines: string[] = [];

  if (snapshot.active.length > 0) {
    lines.push("Active sessions:");
    lines.push(...snapshot.active.map((session, index) => formatSessionLine(index + 1, session)));
  }

  if (snapshot.recent.length > 0) {
    if (lines.length > 0) {
      lines.push("");
    }

    lines.push("Recent sessions:");
    lines.push(
      ...snapshot.recent.map((session, index) =>
        formatSessionLine(snapshot.active.length + index + 1, session)
      )
    );
  }

  return lines.join("\n");
}

export function resolveSessionSelection(
  snapshot: ManagedSessionListSnapshot,
  rawInput: string
): SessionSelection {
  const normalized = rawInput.trim();
  const sessions = getSelectableSessions(snapshot);

  if (!normalized) {
    return {
      session: null,
      error: "Selection cancelled or invalid."
    };
  }

  const byId = sessions.find((session) => session.sessionId === normalized);
  if (byId) {
    return {
      session: byId,
      error: null
    };
  }

  const numericSelection = Number(normalized);
  if (Number.isInteger(numericSelection) && numericSelection >= 1 && numericSelection <= sessions.length) {
    return {
      session: sessions[numericSelection - 1] ?? null,
      error: null
    };
  }

  return {
    session: null,
    error: `Enter a number between 1 and ${sessions.length}, or a valid session id.`
  };
}

export async function promptForSessionSelection(
  snapshot: ManagedSessionListSnapshot
): Promise<SessionSelection> {
  const rl = createInterface({
    input,
    output
  });

  try {
    const answer = await rl.question("Select a session by number or id: ");
    return resolveSessionSelection(snapshot, answer);
  } finally {
    rl.close();
  }
}
