import type { AttachSessionResult, ManagedSessionSummary } from "@codex-realtime-board/shared";

import { consoleIO, type CommandIO } from "./commandIO.js";
import { ensureBridgeReady, type BridgeReadyResult } from "./bridgeProcess.js";
import { openPanelUrl } from "./startCommand.js";

export interface AttachCommandDependencies {
  ensureBridgeReady?: () => Promise<BridgeReadyResult>;
  openPanel?: (url: string) => Promise<void> | void;
  io?: CommandIO;
}

function formatSessionLine(index: number, session: ManagedSessionSummary): string {
  return `${index}. ${session.sessionId} | ${session.title} | ${session.status} | ${session.lastActiveAt}`;
}

function printSelectionGuidance(result: AttachSessionResult, io: CommandIO): void {
  if (result.sessions.active.length > 0) {
    io.log(
      ["Active sessions:", ...result.sessions.active.map((session, index) => formatSessionLine(index + 1, session))].join(
        "\n"
      )
    );
  }

  if (result.sessions.recent.length > 0) {
    io.log(
      ["Recent sessions:", ...result.sessions.recent.map((session, index) => formatSessionLine(index + 1, session))].join(
        "\n"
      )
    );
  }

  io.log("Run `codex-board attach <session-id>` to select one.");
}

export async function runAttachCommand(
  args: string[],
  dependencies: AttachCommandDependencies = {}
): Promise<number> {
  const io = dependencies.io ?? consoleIO;
  const bridge = await (dependencies.ensureBridgeReady ?? ensureBridgeReady)();
  const targetSessionId = args[0] ?? null;
  const result = await bridge.client.attachSession({
    sessionId: targetSessionId
  });

  if (result.resolution === "attached" && result.session && result.panelUrl) {
    const openPanel = dependencies.openPanel ?? openPanelUrl;
    try {
      await openPanel(result.panelUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to open panel";
      io.error(`Failed to open panel automatically: ${message}`);
    }

    io.log(
      [
        "[codex-board] attach",
        `- Bridge: ${bridge.bridgeBaseUrl} (${bridge.launched ? "started" : "ready"})`,
        `- Session: ${result.session.sessionId}`,
        `- Panel: ${result.panelUrl}`
      ].join("\n")
    );
    return 0;
  }

  if (result.resolution === "no-sessions") {
    io.error("No board-managed sessions are available yet. Run `codex-board start` first.");
    return 1;
  }

  if (result.resolution === "not-found") {
    io.error(`Managed session not found: ${targetSessionId ?? "unknown"}`);
    printSelectionGuidance(result, io);
    return 1;
  }

  printSelectionGuidance(result, io);
  return 1;
}
