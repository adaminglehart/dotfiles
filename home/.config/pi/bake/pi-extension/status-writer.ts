/**
 * bake status-writer extension
 *
 * Writes ~/.pi/agent/status/<session-name>.json on agent_start and agent_end events.
 * bake reads these files for precise idle/working status badges.
 *
 * Install: add this file path to settings.json "extensions" array, or place in
 * ~/.pi/agent/extensions/
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";

const STATUS_DIR = join(process.env.HOME ?? "~", ".pi", "agent", "status");

type Status = "working" | "waiting" | "idle";

async function writeStatus(name: string, status: Status): Promise<void> {
  await mkdir(STATUS_DIR, { recursive: true });
  const file = join(STATUS_DIR, `${name}.json`);
  await writeFile(file, JSON.stringify({ status, updatedAt: Date.now() }), "utf-8");
}

function sessionName(ctx: Parameters<Parameters<ExtensionAPI["on"]>[1]>[1]): string {
  // Use the session name set by bake, fall back to session file basename
  const sessionFile = ctx.sessionManager.getSessionFile();
  if (sessionFile) {
    return sessionFile.replace(/\.jsonl$/, "").split("/").pop() ?? "unknown";
  }
  return "unknown";
}

export default function (pi: ExtensionAPI) {
  pi.on("agent_start", async (_event, ctx) => {
    const name = sessionName(ctx);
    await writeStatus(name, "working").catch(() => {});
  });

  pi.on("agent_end", async (_event, ctx) => {
    const name = sessionName(ctx);
    await writeStatus(name, "waiting").catch(() => {});
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    const name = sessionName(ctx);
    await writeStatus(name, "idle").catch(() => {});
  });
}
