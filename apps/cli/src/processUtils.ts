import { spawn } from "node:child_process";
import net from "node:net";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function spawnDetachedProcess(
  executable: string,
  args: string[],
  options: {
    env?: NodeJS.ProcessEnv;
  } = {}
): void {
  const child = spawn(executable, args, {
    detached: true,
    stdio: "ignore",
    env: options.env ?? process.env
  });
  child.unref();
}

export async function isTcpUrlReachable(targetUrl: string): Promise<boolean> {
  const url = new URL(targetUrl);
  const port = Number(url.port || (url.protocol === "https:" || url.protocol === "wss:" ? "443" : "80"));

  return new Promise<boolean>((resolve) => {
    const socket = net.connect({
      host: url.hostname,
      port
    });

    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
  });
}
