import {
  PANEL_BRIDGE_URL_QUERY_PARAM,
  PANEL_SESSION_ID_QUERY_PARAM,
  type AttachSessionRequest,
  type AttachSessionResult,
  type BoardStateSyncResult,
  type ManagedSessionListSnapshot,
  type StartSessionRequest,
  type StartSessionResult
} from "@codex-realtime-board/shared";
import type { BoardStateSnapshot } from "@codex-realtime-board/shared";

import type { SessionRegistry } from "./sessionRegistry.js";

export interface BridgeControlApi {
  getState(sessionId?: string | null): BoardStateSnapshot | null;
  getStateSync(sessionId?: string | null, since?: string | null): BoardStateSyncResult | null;
  listSessions(): ManagedSessionListSnapshot;
  startSession(request: StartSessionRequest): Promise<StartSessionResult>;
  attachSession(request: AttachSessionRequest): Promise<AttachSessionResult>;
}

export interface BridgeControlApiOptions {
  registry: SessionRegistry;
  getBridgeBaseUrl(): string;
  getPanelBaseUrl(): string;
  startSession(request: StartSessionRequest): Promise<BoardStateSnapshot>;
}

function buildPanelUrl(panelBaseUrl: string, bridgeBaseUrl: string, sessionId: string): string {
  const url = new URL(panelBaseUrl);
  url.searchParams.set(PANEL_SESSION_ID_QUERY_PARAM, sessionId);
  url.searchParams.set(PANEL_BRIDGE_URL_QUERY_PARAM, bridgeBaseUrl);
  return url.toString();
}

export function createBridgeControlApi(options: BridgeControlApiOptions): BridgeControlApi {
  function withPanelUrl(sessionId: string): string {
    return buildPanelUrl(options.getPanelBaseUrl(), options.getBridgeBaseUrl(), sessionId);
  }

  return {
    getState(sessionId) {
      return options.registry.getState(sessionId);
    },
    getStateSync(sessionId, since) {
      return options.registry.getStateSync(sessionId, since);
    },
    listSessions() {
      return options.registry.listSessions();
    },
    async startSession(request) {
      const snapshot = await options.startSession(request);
      const session = options.registry.upsertState(snapshot, { select: true });
      return {
        session,
        sessions: options.registry.listSessions(),
        panelUrl: withPanelUrl(session.sessionId)
      };
    },
    async attachSession(request) {
      const sessions = options.registry.listSessions();
      const totalSessions = sessions.active.length + sessions.recent.length;

      if (request.sessionId) {
        const session = options.registry.selectSession(request.sessionId);
        return {
          resolution: session ? "attached" : "not-found",
          session,
          sessions: options.registry.listSessions(),
          panelUrl: session ? withPanelUrl(session.sessionId) : null
        };
      }

      if (sessions.active.length === 1) {
        const session = options.registry.selectSession(sessions.active[0]!.sessionId);
        return {
          resolution: "attached",
          session,
          sessions: options.registry.listSessions(),
          panelUrl: session ? withPanelUrl(session.sessionId) : null
        };
      }

      if (totalSessions === 0) {
        return {
          resolution: "no-sessions",
          session: null,
          sessions,
          panelUrl: null
        };
      }

      return {
        resolution: "selection-required",
        session: null,
        sessions,
        panelUrl: null
      };
    }
  };
}
