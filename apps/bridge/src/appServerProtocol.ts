export type RequestId = string | number;

export interface AppServerClientInfo {
  name: string;
  version: string;
}

export interface AppServerInitializeCapabilities {
  experimentalApi: boolean;
  optOutNotificationMethods?: string[] | null;
}

export interface AppServerInitializeParams {
  clientInfo: AppServerClientInfo;
  capabilities: AppServerInitializeCapabilities | null;
}

export interface AppServerInitializeResult {
  userAgent: string;
  codexHome: string;
  platformFamily: string;
  platformOs: string;
}

export type AppServerApprovalPolicy =
  | "untrusted"
  | "on-failure"
  | "on-request"
  | "never"
  | {
      granular: {
        sandbox_approval: boolean;
        rules: boolean;
        skill_approval: boolean;
        request_permissions: boolean;
        mcp_elicitations: boolean;
      };
    };

export type AppServerSandboxMode = "read-only" | "workspace-write" | "danger-full-access";

export interface AppServerThreadStartParams {
  model?: string | null;
  modelProvider?: string | null;
  cwd?: string | null;
  approvalPolicy?: AppServerApprovalPolicy | null;
  sandbox?: AppServerSandboxMode | null;
  ephemeral?: boolean | null;
  experimentalRawEvents: boolean;
  persistExtendedHistory: boolean;
}

export interface AppServerThreadResumeParams {
  threadId: string;
  cwd?: string | null;
  approvalPolicy?: AppServerApprovalPolicy | null;
  sandbox?: AppServerSandboxMode | null;
  persistExtendedHistory: boolean;
}

export interface AppServerTurnStartParams {
  threadId: string;
  input: AppServerUserInput[];
}

export interface AppServerThreadReadParams {
  threadId: string;
  includeTurns: boolean;
}

export type AppServerThreadActiveFlag = "waitingOnApproval" | "waitingOnUserInput";

export type AppServerThreadStatus =
  | { type: "notLoaded" }
  | { type: "idle" }
  | { type: "systemError" }
  | { type: "active"; activeFlags: AppServerThreadActiveFlag[] };

export interface AppServerThread {
  id: string;
  preview: string;
  ephemeral: boolean;
  modelProvider: string;
  createdAt: number;
  updatedAt: number;
  status: AppServerThreadStatus;
  path: string | null;
  cwd: string;
  cliVersion: string;
  source: string;
  agentNickname: string | null;
  agentRole: string | null;
  name: string | null;
  turns: unknown[];
}

export interface AppServerThreadStartResult {
  thread: AppServerThread;
  model: string;
  modelProvider: string;
}

export interface AppServerThreadResumeResult {
  thread: AppServerThread;
  model: string;
  modelProvider: string;
}

export interface AppServerTurn {
  id: string;
  items: AppServerThreadItem[];
  status: string;
  error: AppServerTurnError | null;
}

export interface AppServerTurnStartResult {
  turn: AppServerTurn;
}

export interface AppServerThreadReadResult {
  thread: AppServerThread;
}

export interface AppServerTurnError {
  message: string;
  additionalDetails: string | null;
}

export interface AppServerTokenUsageBreakdown {
  totalTokens: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
}

export interface AppServerThreadTokenUsage {
  total: AppServerTokenUsageBreakdown;
  last: AppServerTokenUsageBreakdown;
  modelContextWindow: number | null;
}

export interface AppServerTurnPlanStep {
  step: string;
  status: "pending" | "inProgress" | "completed";
}

export type AppServerWebSearchAction =
  | { type: "search"; query: string | null; queries: string[] | null }
  | { type: "openPage"; url: string | null }
  | { type: "findInPage"; url: string | null; pattern: string | null }
  | { type: "other" };

export interface AppServerMemoryCitationEntry {
  path: string;
  lineStart: number;
  lineEnd: number;
  note: string;
}

export interface AppServerMemoryCitation {
  entries: AppServerMemoryCitationEntry[];
  threadIds: string[];
}

export type AppServerUserInput = {
  type: "text";
  text: string;
  text_elements: unknown[];
};

export type AppServerThreadItem =
  | { type: "userMessage"; id: string; content: AppServerUserInput[] }
  | { type: "agentMessage"; id: string; text: string; phase: string | null; memoryCitation: AppServerMemoryCitation | null }
  | { type: "plan"; id: string; text: string }
  | { type: "reasoning"; id: string; summary: string[]; content: string[] }
  | {
      type: "commandExecution";
      id: string;
      command: string;
      cwd: string;
      processId: string | null;
      source: string;
      status: string;
      commandActions: unknown[];
      aggregatedOutput: string | null;
      exitCode: number | null;
      durationMs: number | null;
    }
  | { type: "fileChange"; id: string; changes: unknown[]; status: string }
  | {
      type: "mcpToolCall";
      id: string;
      server: string;
      tool: string;
      status: string;
      arguments: unknown;
      result: unknown | null;
      error: unknown | null;
      durationMs: number | null;
    }
  | {
      type: "dynamicToolCall";
      id: string;
      tool: string;
      arguments: unknown;
      status: string;
      contentItems: unknown[] | null;
      success: boolean | null;
      durationMs: number | null;
    }
  | {
      type: "collabAgentToolCall";
      id: string;
      tool: string;
      status: string;
      senderThreadId: string;
      receiverThreadIds: string[];
      prompt: string | null;
      model: string | null;
      reasoningEffort: string | null;
      agentsStates: Record<string, unknown>;
    }
  | { type: "webSearch"; id: string; query: string; action: AppServerWebSearchAction | null }
  | { type: "imageView"; id: string; path: string }
  | { type: "imageGeneration"; id: string; status: string; revisedPrompt: string | null; result: string; savedPath?: string }
  | { type: "enteredReviewMode"; id: string; review: string }
  | { type: "exitedReviewMode"; id: string; review: string }
  | { type: "contextCompaction"; id: string };

export type AppServerResponseMessage<TResult = unknown> =
  | { id: RequestId; result: TResult }
  | { id: RequestId; error: unknown };

export interface AppServerNotificationBase<TMethod extends string, TParams> {
  method: TMethod;
  params: TParams;
}

export type ThreadStartedNotification = AppServerNotificationBase<
  "thread/started",
  { thread: AppServerThread }
>;

export type ThreadStatusChangedNotification = AppServerNotificationBase<
  "thread/status/changed",
  { threadId: string; status: AppServerThreadStatus }
>;

export type TurnStartedNotification = AppServerNotificationBase<
  "turn/started",
  { threadId: string; turn: AppServerTurn }
>;

export type TurnCompletedNotification = AppServerNotificationBase<
  "turn/completed",
  { threadId: string; turn: AppServerTurn }
>;

export type ItemStartedNotification = AppServerNotificationBase<
  "item/started",
  { item: AppServerThreadItem; threadId: string; turnId: string }
>;

export type ItemCompletedNotification = AppServerNotificationBase<
  "item/completed",
  { item: AppServerThreadItem; threadId: string; turnId: string }
>;

export type ThreadTokenUsageUpdatedNotification = AppServerNotificationBase<
  "thread/tokenUsage/updated",
  { threadId: string; turnId: string; tokenUsage: AppServerThreadTokenUsage }
>;

export type TurnPlanUpdatedNotification = AppServerNotificationBase<
  "turn/plan/updated",
  { threadId: string; turnId: string; explanation: string | null; plan: AppServerTurnPlanStep[] }
>;

export type SkillsChangedNotification = AppServerNotificationBase<"skills/changed", Record<string, never>>;

export type ContextCompactedNotification = AppServerNotificationBase<
  "thread/compacted",
  { threadId: string; turnId: string }
>;

export type ErrorNotification = AppServerNotificationBase<
  "error",
  { error: AppServerTurnError; willRetry: boolean; threadId: string; turnId: string }
>;

export type AppServerNotificationMessage =
  | ThreadStartedNotification
  | ThreadStatusChangedNotification
  | TurnStartedNotification
  | TurnCompletedNotification
  | ItemStartedNotification
  | ItemCompletedNotification
  | ThreadTokenUsageUpdatedNotification
  | TurnPlanUpdatedNotification
  | SkillsChangedNotification
  | ContextCompactedNotification
  | ErrorNotification;

export type AppServerMessage = AppServerNotificationMessage | AppServerResponseMessage;
