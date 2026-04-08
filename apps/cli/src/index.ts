#!/usr/bin/env node

import { V1_PRIMARY_TABS } from "@codex-realtime-board/shared";

const command = process.argv[2];

function printHelp(): void {
  console.log(`codex-board <command>\n\nCommands:\n  start   Start a board-managed Codex session\n  attach  Attach to an existing board-managed session\n  help    Show this message`);
}

function printStartPlaceholder(): void {
  console.log([
    "[codex-board] start",
    "- Launcher skeleton is ready.",
    "- Next step: start local bridge, open panel, and boot a managed Codex session.",
    `- V1 tabs: ${V1_PRIMARY_TABS.join(", ")}`
  ].join("\n"));
}

function printAttachPlaceholder(): void {
  console.log([
    "[codex-board] attach",
    "- Attach flow skeleton is ready.",
    "- Next step: inspect active and recent board-managed sessions before selecting one."
  ].join("\n"));
}

switch (command) {
  case "start":
    printStartPlaceholder();
    break;
  case "attach":
    printAttachPlaceholder();
    break;
  case "help":
  case undefined:
    printHelp();
    break;
  default:
    console.error(`[codex-board] Unknown command: ${command}`);
    printHelp();
    process.exitCode = 1;
}
