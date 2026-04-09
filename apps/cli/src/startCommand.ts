import { spawn } from "node:child_process";

import { consoleIO, type CommandIO } from "./commandIO.js";
import { ensureLauncherReady, type LauncherReadyResult } from "./launcherRuntime.js";

export interface StartCommandDependencies {
  ensureLauncherReady?: () => Promise<LauncherReadyResult>;
  openPanel?: (url: string) => Promise<void> | void;
  io?: CommandIO;
  cwd?: string;
}

function joinPrompt(args: string[]): string | null {
  const prompt = args.join(" ").trim();
  return prompt.length > 0 ? prompt : null;
}

export async function openPanelUrl(url: string): Promise<void> {
  const command =
    process.platform === "darwin"
      ? { executable: "open", args: [url] }
      : process.platform === "win32"
        ? { executable: "cmd", args: ["/c", "start", "", url] }
        : { executable: "xdg-open", args: [url] };

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command.executable, command.args, {
      detached: true,
      stdio: "ignore"
    });
    child.once("error", reject);
    child.unref();
    resolve();
  });
}

export async function runStartCommand(
  args: string[],
  dependencies: StartCommandDependencies = {}
): Promise<number> {
  const io = dependencies.io ?? consoleIO;
  const launcher = await (dependencies.ensureLauncherReady ?? ensureLauncherReady)();
  const result = await launcher.bridge.client.startSession({
    cwd: dependencies.cwd ?? process.cwd(),
    prompt: joinPrompt(args)
  });

  const openPanel = dependencies.openPanel ?? openPanelUrl;
  try {
    await openPanel(result.panelUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to open panel";
    io.error(`Failed to open panel automatically: ${message}`);
  }

  io.log(
    [
      "[codex-board] start",
      `- App server: ${launcher.appServer.appServerUrl} (${launcher.appServer.launched ? "started" : "ready"})`,
      `- Bridge: ${launcher.bridge.bridgeBaseUrl} (${launcher.bridge.launched ? "started" : "ready"})`,
      `- Panel runtime: ${launcher.panel.panelBaseUrl} (${launcher.panel.launched ? "started" : "ready"})`,
      `- Session: ${result.session.sessionId}`,
      `- Panel: ${result.panelUrl}`
    ].join("\n")
  );

  return 0;
}
