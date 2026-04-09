#!/usr/bin/env node

import { fileURLToPath } from "node:url";

import { runAttachCommand, type AttachCommandDependencies } from "./attachCommand.js";
import { consoleIO, type CommandIO } from "./commandIO.js";
import { runStartCommand, type StartCommandDependencies, openPanelUrl } from "./startCommand.js";

export interface CliDependencies {
  io?: CommandIO;
  runStartCommand?: (args: string[], dependencies: StartCommandDependencies) => Promise<number>;
  runAttachCommand?: (args: string[], dependencies: AttachCommandDependencies) => Promise<number>;
  openPanel?: (url: string) => Promise<void> | void;
}

function printHelp(io: CommandIO): void {
  io.log(
    [
      "codex-board <command> [args]",
      "",
      "Commands:",
      "  start [prompt]        Start a board-managed Codex session",
      "  attach [session-id]   Attach to an existing board-managed session",
      "  help                  Show this message"
    ].join("\n")
  );
}

function normalizeCliArgs(args: string[]): string[] {
  let index = 0;
  while (args[index] === "--") {
    index += 1;
  }

  return args.slice(index);
}

export async function runCli(args: string[], dependencies: CliDependencies = {}): Promise<number> {
  const io = dependencies.io ?? consoleIO;
  const normalizedArgs = normalizeCliArgs(args);
  const command = normalizedArgs[0];
  const commandArgs = normalizedArgs.slice(1);
  const openPanel = dependencies.openPanel ?? openPanelUrl;

  switch (command) {
    case "start":
      return (dependencies.runStartCommand ?? runStartCommand)(commandArgs, {
        io,
        openPanel
      });
    case "attach":
      return (dependencies.runAttachCommand ?? runAttachCommand)(commandArgs, {
        io,
        openPanel
      });
    case "help":
    case undefined:
      printHelp(io);
      return 0;
    default:
      io.error(`[codex-board] Unknown command: ${command}`);
      printHelp(io);
      return 1;
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFile) {
  const exitCode = await runCli(process.argv.slice(2));
  process.exitCode = exitCode;
}
