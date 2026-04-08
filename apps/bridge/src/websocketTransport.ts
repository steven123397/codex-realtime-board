import type { AppServerTransport } from "./appServerClient.js";

interface WebSocketLike {
  send(data: string): void;
  close(code?: number, reason?: string): void;
  addEventListener(type: "open", listener: () => void): void;
  addEventListener(type: "message", listener: (event: { data: unknown }) => void): void;
  addEventListener(type: "close", listener: (event: { code: number; reason: string }) => void): void;
  addEventListener(type: "error", listener: (event: unknown) => void): void;
  removeEventListener(type: "open", listener: () => void): void;
  removeEventListener(type: "message", listener: (event: { data: unknown }) => void): void;
  removeEventListener(type: "close", listener: (event: { code: number; reason: string }) => void): void;
  removeEventListener(type: "error", listener: (event: unknown) => void): void;
}

interface WebSocketConstructorLike {
  new (url: string): WebSocketLike;
}

function getWebSocketConstructor(): WebSocketConstructorLike {
  const candidate = (globalThis as unknown as { WebSocket?: WebSocketConstructorLike }).WebSocket;
  if (!candidate) {
    throw new Error("Global WebSocket is not available in this runtime");
  }
  return candidate;
}

function createMessageReader(data: unknown, onText: (text: string) => void): void {
  if (typeof data === "string") {
    onText(data);
    return;
  }

  if (data instanceof ArrayBuffer) {
    onText(Buffer.from(data).toString("utf8"));
    return;
  }

  if (ArrayBuffer.isView(data)) {
    onText(Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString("utf8"));
    return;
  }

  if (typeof Blob !== "undefined" && data instanceof Blob) {
    void data.text().then(onText);
    return;
  }

  onText(String(data));
}

export async function createWebSocketTransport(url: string): Promise<AppServerTransport> {
  const WebSocketCtor = getWebSocketConstructor();
  const socket = new WebSocketCtor(url);
  const messageListeners = new Set<(message: string) => void>();
  const closeListeners = new Set<(code: number, reason: string) => void>();
  const errorListeners = new Set<(error: unknown) => void>();

  await new Promise<void>((resolve, reject) => {
    const handleOpen = () => {
      socket.removeEventListener("error", handleError);
      resolve();
    };
    const handleError = (event: unknown) => {
      socket.removeEventListener("open", handleOpen);
      reject(event);
    };

    socket.addEventListener("open", handleOpen);
    socket.addEventListener("error", handleError);
  });

  socket.addEventListener("message", (event) => {
    createMessageReader(event.data, (text) => {
      for (const listener of messageListeners) {
        listener(text);
      }
    });
  });

  socket.addEventListener("close", (event) => {
    for (const listener of closeListeners) {
      listener(event.code, event.reason);
    }
  });

  socket.addEventListener("error", (event) => {
    for (const listener of errorListeners) {
      listener(event);
    }
  });

  return {
    send(message) {
      socket.send(message);
    },
    close(code, reason) {
      socket.close(code, reason);
    },
    onMessage(listener) {
      messageListeners.add(listener);
      return () => messageListeners.delete(listener);
    },
    onClose(listener) {
      closeListeners.add(listener);
      return () => closeListeners.delete(listener);
    },
    onError(listener) {
      errorListeners.add(listener);
      return () => errorListeners.delete(listener);
    }
  };
}
