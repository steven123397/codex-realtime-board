import type { AttachSessionResult } from "@codex-realtime-board/shared";

import { consoleIO, type CommandIO } from "./commandIO.js";
import { ensureLauncherReady, type LauncherReadyResult } from "./launcherRuntime.js";
import {
  promptForSessionSelection,
  renderSessionSelection
} from "./sessionSelector.js";
import { openPanelUrl } from "./startCommand.js";

export interface AttachCommandDependencies {
  ensureLauncherReady?: () => Promise<LauncherReadyResult>;
  openPanel?: (url: string) => Promise<void> | void;
  io?: CommandIO;
  selectSession?: (result: AttachSessionResult) => Promise<string | null>;
}

function printSelectionGuidance(result: AttachSessionResult, io: CommandIO): void {
  io.log(renderSessionSelection(result.sessions));
}

async function selectSessionInteractively(result: AttachSessionResult): Promise<string | null> {
  const selection = await promptForSessionSelection(result.sessions);
  return selection.session?.sessionId ?? null;
}

export async function runAttachCommand(
  args: string[],
  dependencies: AttachCommandDependencies = {}
): Promise<number> {
  const io = dependencies.io ?? consoleIO;
  const launcher = await (dependencies.ensureLauncherReady ?? ensureLauncherReady)();
  const targetSessionId = args[0] ?? null;
  let result = await launcher.bridge.client.attachSession({
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
        `- App server: ${launcher.appServer.appServerUrl} (${launcher.appServer.launched ? "started" : "ready"})`,
        `- Bridge: ${launcher.bridge.bridgeBaseUrl} (${launcher.bridge.launched ? "started" : "ready"})`,
        `- Panel runtime: ${launcher.panel.panelBaseUrl} (${launcher.panel.launched ? "started" : "ready"})`,
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

  const selectedSessionId = await (dependencies.selectSession ?? selectSessionInteractively)(result);
  if (!selectedSessionId) {
    io.error("Selection cancelled or invalid.");
    return 1;
  }

  result = await launcher.bridge.client.attachSession({
    sessionId: selectedSessionId
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
        `- App server: ${launcher.appServer.appServerUrl} (${launcher.appServer.launched ? "started" : "ready"})`,
        `- Bridge: ${launcher.bridge.bridgeBaseUrl} (${launcher.bridge.launched ? "started" : "ready"})`,
        `- Panel runtime: ${launcher.panel.panelBaseUrl} (${launcher.panel.launched ? "started" : "ready"})`,
        `- Session: ${result.session.sessionId}`,
        `- Panel: ${result.panelUrl}`
      ].join("\n")
    );
    return 0;
  }

  if (result.resolution === "not-found") {
    io.error(`Managed session not found: ${selectedSessionId}`);
    return 1;
  }

  printSelectionGuidance(result, io);
  return 1;
}
