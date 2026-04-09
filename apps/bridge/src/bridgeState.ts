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

import type {
  AppServerMemoryCitation,
  AppServerNotificationMessage,
  AppServerThreadItem,
  AppServerThreadStatus,
  AppServerWebSearchAction
} from "./appServerProtocol.js";

export interface BridgeStateStore {
  applyNotification(notification: AppServerNotificationMessage, at?: Date): void;
  getState(): BoardStateSnapshot;
}

interface ToolCardInternal extends ToolSessionCard {
  itemId: string;
}

interface SearchCardInternal extends SearchSessionCard {
  itemId: string;
}

export function createEmptyBridgeState(): BoardStateSnapshot {
  const context: ContextSnapshot = {
    usedTokens: 0,
    contextWindow: 0,
    remainingTokens: 0,
    recentCompactions: [],
    growthTrend: "steady",
    pressure: "low"
  };

  return {
    session: {
      sessionId: "session_pending",
      title: "Waiting for Codex app-server",
      status: "idle",
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

export function createBridgeStateStore(
  initialState: BoardStateSnapshot = createEmptyBridgeState()
): BridgeStateStore {
  const state = structuredClone(initialState);
  const toolCards = new Map<string, ToolCardInternal>();
  const searchCards = new Map<string, SearchCardInternal>();

  function setSessionId(threadId: string): void {
    state.session.sessionId = threadId;
  }

  function setLastActive(at: Date): void {
    state.session.lastActiveAt = at.toISOString();
  }

  function syncCollections(): void {
    state.tools = Array.from(toolCards.values()).map(({ itemId: _itemId, ...card }) => card);
    state.searches = Array.from(searchCards.values()).map(({ itemId: _itemId, ...card }) => card);
    state.overview.contextBudget = { ...state.context };
  }

  function updateStatus(status: AppServerThreadStatus): void {
    if (status.type === "systemError") {
      state.session.status = "error";
      state.overview.currentPhase = "error";
      state.overview.pendingUserAction = {
        kind: "error",
        label: "Codex thread reported a system error"
      };
      return;
    }

    if (status.type === "idle" || status.type === "notLoaded") {
      state.session.status = "idle";
      state.overview.pendingUserAction = null;
      return;
    }

    const waitingOnUserInput = status.activeFlags.includes("waitingOnUserInput");
    const waitingOnApproval = status.activeFlags.includes("waitingOnApproval");
    if (waitingOnUserInput) {
      state.session.status = "waiting-user";
      state.overview.pendingUserAction = {
        kind: "input",
        label: "Waiting for user input"
      };
      return;
    }

    if (waitingOnApproval) {
      state.session.status = "waiting-user";
      state.overview.pendingUserAction = {
        kind: "approval",
        label: "Waiting for approval"
      };
      return;
    }

    state.session.status = "running";
    state.overview.pendingUserAction = null;
  }

  function updateContext(totalTokens: number, contextWindow: number | null): void {
    const safeWindow = contextWindow ?? state.context.contextWindow;
    const remaining = safeWindow > 0 ? Math.max(safeWindow - totalTokens, 0) : state.context.remainingTokens;
    const usageRatio = safeWindow > 0 ? totalTokens / safeWindow : 0;

    state.context = {
      ...state.context,
      usedTokens: totalTokens,
      contextWindow: safeWindow,
      remainingTokens: remaining,
      growthTrend: totalTokens > state.context.usedTokens ? "rising" : state.context.growthTrend,
      pressure: usageRatio >= 0.8 ? "high" : usageRatio >= 0.6 ? "medium" : "low"
    };
  }

  function describeWebSearchAction(action: AppServerWebSearchAction | null): string[] {
    if (!action) {
      return [];
    }

    switch (action.type) {
      case "search":
        return action.queries ?? (action.query ? [action.query] : []);
      case "openPage":
        return action.url ? [action.url] : [];
      case "findInPage":
        return [action.url, action.pattern].filter((value): value is string => Boolean(value));
      default:
        return [];
    }
  }

  function rememberMemoryCitation(memoryCitation: AppServerMemoryCitation, turnId: string): void {
    state.memories.unshift({
      sourceThreadId: memoryCitation.threadIds[0] ?? state.session.sessionId,
      entries: memoryCitation.entries.map((entry) => ({
        title: `${entry.path}:${entry.lineStart}`,
        excerpt: entry.note
      })),
      usedByTurnId: turnId
    });
  }

  function upsertToolCard(item: Extract<AppServerThreadItem, { type: "commandExecution" | "mcpToolCall" | "dynamicToolCall" | "collabAgentToolCall" }>, status: ToolSessionCard["status"], at: Date): void {
    const startedAt = toolCards.get(item.id)?.startedAt ?? at.toISOString();
    const baseCard =
      item.type === "commandExecution"
        ? {
            toolKind: "shell" as const,
            title: item.command,
            reason: item.cwd,
            summary: item.aggregatedOutput ?? "Command execution event received",
            startedAt
          }
        : item.type === "mcpToolCall"
          ? {
              toolKind: "mcp" as const,
              title: `${item.server}/${item.tool}`,
              reason: "MCP tool call",
              summary: item.error ? "MCP tool call failed" : "MCP tool call event received",
              startedAt
            }
          : item.type === "dynamicToolCall"
            ? {
                toolKind: "skill" as const,
                title: item.tool,
                reason: "Dynamic tool call",
                summary: item.success === false ? "Dynamic tool call failed" : "Dynamic tool call event received",
                startedAt
              }
            : {
                toolKind: "skill" as const,
                title: item.tool,
                reason: item.prompt ?? "Collaboration tool call",
                summary: `Targets: ${item.receiverThreadIds.join(", ") || "unknown"}`,
                startedAt
              };

    toolCards.set(item.id, {
      itemId: item.id,
      ...baseCard,
      endedAt: status === "completed" || status === "failed" ? at.toISOString() : undefined,
      status
    });
  }

  function upsertSearchCard(item: Extract<AppServerThreadItem, { type: "webSearch" }>, status: SearchSessionCard["status"], at: Date): void {
    const existing = searchCards.get(item.id);
    searchCards.set(item.id, {
      itemId: item.id,
      query: item.query,
      actions: describeWebSearchAction(item.action),
      summary: status === "completed" ? "Search event completed" : "Search event in progress",
      inferredIndexing: false,
      startedAt: existing?.startedAt ?? at.toISOString(),
      status
    });
  }

  function applyItem(item: AppServerThreadItem, turnId: string, lifecycle: "started" | "completed", at: Date): void {
    switch (item.type) {
      case "reasoning":
      case "plan":
        state.overview.currentPhase = "planning";
        state.overview.currentTool = null;
        break;
      case "webSearch":
        state.overview.currentPhase = "searching";
        state.overview.currentTool = "webSearch";
        upsertSearchCard(item, lifecycle === "completed" ? "completed" : "active", at);
        break;
      case "commandExecution":
      case "mcpToolCall":
      case "dynamicToolCall":
      case "collabAgentToolCall":
        state.overview.currentPhase = "executing";
        state.overview.currentTool = item.type === "commandExecution" ? "shell" : item.type === "mcpToolCall" ? "mcp" : "skill";
        upsertToolCard(item, lifecycle === "completed" ? "completed" : "active", at);
        break;
      case "fileChange":
        state.overview.currentPhase = "editing";
        state.overview.currentTool = null;
        break;
      case "agentMessage":
        state.overview.currentPhase = lifecycle === "completed" ? "completed" : state.overview.currentPhase;
        state.overview.currentTool = null;
        if (lifecycle === "completed" && item.memoryCitation) {
          rememberMemoryCitation(item.memoryCitation, turnId);
        }
        break;
      case "contextCompaction":
        state.context.recentCompactions = [at.toISOString(), ...state.context.recentCompactions].slice(0, 5);
        break;
      default:
        break;
    }
  }

  return {
    applyNotification(notification, at = new Date()) {
      switch (notification.method) {
        case "thread/started": {
          const thread = notification.params.thread;
          setSessionId(thread.id);
          state.session.title = (thread.name ?? thread.preview) || thread.cwd || "Codex thread";
          state.session.isManaged = true;
          setLastActive(at);
          updateStatus(thread.status);
          break;
        }
        case "thread/status/changed":
          setSessionId(notification.params.threadId);
          setLastActive(at);
          updateStatus(notification.params.status);
          break;
        case "turn/started":
          setSessionId(notification.params.threadId);
          setLastActive(at);
          state.overview.currentPhase = "planning";
          break;
        case "turn/completed":
          setSessionId(notification.params.threadId);
          setLastActive(at);
          if (notification.params.turn.error) {
            state.session.status = "error";
            state.overview.currentPhase = "error";
            state.overview.pendingUserAction = {
              kind: "error",
              label: notification.params.turn.error.message
            };
          } else {
            state.session.status = "completed";
            state.overview.currentPhase = "completed";
            state.overview.currentTool = null;
            state.overview.pendingUserAction = null;
          }
          break;
        case "item/started":
          setSessionId(notification.params.threadId);
          setLastActive(at);
          applyItem(notification.params.item, notification.params.turnId, "started", at);
          break;
        case "item/completed":
          setSessionId(notification.params.threadId);
          setLastActive(at);
          applyItem(notification.params.item, notification.params.turnId, "completed", at);
          break;
        case "thread/tokenUsage/updated":
          setSessionId(notification.params.threadId);
          setLastActive(at);
          updateContext(
            notification.params.tokenUsage.total.totalTokens,
            notification.params.tokenUsage.modelContextWindow
          );
          break;
        case "turn/plan/updated":
          setSessionId(notification.params.threadId);
          setLastActive(at);
          state.overview.currentPhase = "planning";
          break;
        case "skills/changed":
          state.skills.unshift({
            skillName: "Skills registry changed",
            source: "app-server",
            status: "completed",
            timestamp: at.toISOString()
          });
          break;
        case "thread/compacted":
          setSessionId(notification.params.threadId);
          setLastActive(at);
          state.context.recentCompactions = [at.toISOString(), ...state.context.recentCompactions].slice(0, 5);
          break;
        case "error":
          setSessionId(notification.params.threadId);
          setLastActive(at);
          state.session.status = "error";
          state.overview.currentPhase = "error";
          state.overview.pendingUserAction = {
            kind: "error",
            label: notification.params.error.message
          };
          break;
        default:
          break;
      }

      syncCollections();
    },
    getState() {
      return structuredClone(state);
    }
  };
}
