import type {
  AppServerClientInfo,
  AppServerInitializeCapabilities,
  AppServerInitializeParams,
  AppServerInitializeResult,
  AppServerMessage,
  AppServerNotificationMessage,
  AppServerThreadReadParams,
  AppServerThreadReadResult,
  AppServerThreadResumeParams,
  AppServerThreadResumeResult,
  AppServerThreadStartParams,
  AppServerThreadStartResult,
  AppServerTurnStartParams,
  AppServerTurnStartResult,
  RequestId
} from "./appServerProtocol.js";

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason?: unknown) => void;
}

export interface AppServerTransport {
  send(message: string): void;
  close(code?: number, reason?: string): void;
  onMessage(listener: (message: string) => void): () => void;
  onClose(listener: (code: number, reason: string) => void): () => void;
  onError(listener: (error: unknown) => void): () => void;
}

export interface AppServerClient {
  initialize(clientInfo: AppServerClientInfo, capabilities?: AppServerInitializeCapabilities | null): Promise<AppServerInitializeResult>;
  startThread(params: AppServerThreadStartParams): Promise<AppServerThreadStartResult>;
  resumeThread(params: AppServerThreadResumeParams): Promise<AppServerThreadResumeResult>;
  readThread(params: AppServerThreadReadParams): Promise<AppServerThreadReadResult>;
  startTurn(params: AppServerTurnStartParams): Promise<AppServerTurnStartResult>;
  onNotification(listener: (notification: AppServerNotificationMessage) => void): () => void;
  close(code?: number, reason?: string): void;
}

export function createAppServerClient(transport: AppServerTransport): AppServerClient {
  let nextId = 1;
  const pendingRequests = new Map<RequestId, PendingRequest>();
  const notificationListeners = new Set<(notification: AppServerNotificationMessage) => void>();

  transport.onMessage((message) => {
    const parsed = JSON.parse(message) as AppServerMessage;
    if (typeof parsed === "object" && parsed !== null && "id" in parsed) {
      const pending = pendingRequests.get(parsed.id);
      if (!pending) {
        return;
      }

      pendingRequests.delete(parsed.id);
      if ("error" in parsed) {
        pending.reject(parsed.error);
        return;
      }

      pending.resolve(parsed.result);
      return;
    }

    const notification = parsed as AppServerNotificationMessage;
    for (const listener of notificationListeners) {
      listener(notification);
    }
  });

  transport.onClose((_code, reason) => {
    if (pendingRequests.size === 0) {
      return;
    }

    const error = new Error(reason || "app-server connection closed");
    for (const pending of pendingRequests.values()) {
      pending.reject(error);
    }
    pendingRequests.clear();
  });

  transport.onError((error) => {
    if (pendingRequests.size === 0) {
      return;
    }

    for (const pending of pendingRequests.values()) {
      pending.reject(error);
    }
    pendingRequests.clear();
  });

  function request<TResult>(method: string, params: unknown): Promise<TResult> {
    return new Promise<TResult>((resolve, reject) => {
      const id = nextId++;
      pendingRequests.set(id, { resolve, reject });
      transport.send(JSON.stringify({ id, method, params }));
    });
  }

  return {
    initialize(clientInfo, capabilities = null) {
      const params: AppServerInitializeParams = {
        clientInfo,
        capabilities
      };
      return request<AppServerInitializeResult>("initialize", params);
    },
    startThread(params) {
      return request<AppServerThreadStartResult>("thread/start", params);
    },
    resumeThread(params) {
      return request<AppServerThreadResumeResult>("thread/resume", params);
    },
    readThread(params) {
      return request<AppServerThreadReadResult>("thread/read", params);
    },
    startTurn(params) {
      return request<AppServerTurnStartResult>("turn/start", params);
    },
    onNotification(listener) {
      notificationListeners.add(listener);
      return () => notificationListeners.delete(listener);
    },
    close(code, reason) {
      transport.close(code, reason);
    }
  };
}
