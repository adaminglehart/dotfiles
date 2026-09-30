import { existsSync, readFileSync, readdirSync as fsReaddirSync } from "node:fs";
import { join } from "node:path";
import { listWindows, type TmuxWindow } from "./tmux-client.ts";
import { sendNotification } from "./notify.ts";

const SESSIONS_DIR = `${process.env.HOME}/.pi/agent/sessions`;
const STATUS_DIR = `${process.env.HOME}/.pi/agent/status`;

export type SessionStatus = "working" | "waiting" | "idle";

export interface Session {
  name: string;
  status: SessionStatus;
  lastMessage?: string;
  lastActivity?: number;
}

type Listener = (sessions: Session[]) => void;

export class SessionStore {
  private sessions: Session[] = [];
  private listeners: Set<Listener> = new Set();
  private interval: ReturnType<typeof setInterval> | null = null;
  private prevWaiting: Set<string> = new Set();

  start(pollMs = 1000): void {
    this.poll();
    this.interval = setInterval(() => this.poll(), pollMs);
  }

  stop(): void {
    if (this.interval !== null) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.sessions);
    return () => this.listeners.delete(fn);
  }

  getSessions(): Session[] {
    return this.sessions;
  }

  private async poll(): Promise<void> {
    try {
      const windows = await listWindows();
      const sessions = windows.map((w) => this.buildSession(w));
      this.checkNotifications(sessions);
      this.sessions = sessions;
      this.notify();
    } catch {
      // Tmux may not be running — emit empty list
      this.sessions = [];
      this.notify();
    }
  }

  private buildSession(window: TmuxWindow): Session {
    const status = this.detectStatus(window);
    const { lastMessage, lastActivity } = this.readSessionFile(window.name);
    return { name: window.name, status, lastMessage, lastActivity };
  }

  private detectStatus(window: TmuxWindow): SessionStatus {
    // Check precise status from pi extension status file first
    const statusFile = join(STATUS_DIR, `${window.name}.json`);
    if (existsSync(statusFile)) {
      try {
        const data = JSON.parse(readFileSync(statusFile, "utf-8")) as { status: SessionStatus };
        return data.status;
      } catch {
        // fall through to heuristic
      }
    }

    // Heuristic fallback: if pane is running docker/pi, consider it working
    const cmd = window.paneCurrentCommand.toLowerCase();
    if (cmd === "docker" || cmd === "pi" || cmd === "bun" || cmd === "node") {
      return "working";
    }

    return "idle";
  }

  private readSessionFile(name: string): { lastMessage?: string; lastActivity?: number } {
    try {
      const dir = SESSIONS_DIR;
      if (!existsSync(dir)) return {};

      // Find session file matching this window name (filename contains the session name)
      const files = readdirSync(dir).filter((f) => f.includes(name) && f.endsWith(".jsonl"));
      if (files.length === 0) return {};

      // Read last non-empty line of JSONL
      const filePath = join(dir, files[0]);
      const content = readFileSync(filePath, "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);
      if (lines.length === 0) return {};

      // Walk backwards to find last assistant message
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const entry = JSON.parse(lines[i]);
          if (entry.type === "message" && entry.message?.role === "assistant") {
            const textBlock = (entry.message.content as { type: string; text?: string }[])
              ?.find((b) => b.type === "text");
            if (textBlock?.text) {
              return {
                lastMessage: textBlock.text.slice(0, 200),
                lastActivity: entry.timestamp,
              };
            }
          }
        } catch {
          continue;
        }
      }
    } catch {
      // ignore
    }
    return {};
  }

  private checkNotifications(sessions: Session[]): void {
    const nowWaiting = new Set<string>();

    for (const s of sessions) {
      if (s.status === "waiting") {
        nowWaiting.add(s.name);
        if (!this.prevWaiting.has(s.name)) {
          // Transitioned to waiting — send notification
          sendNotification(`${s.name} is waiting for input`, "bake");
        }
      }
    }

    this.prevWaiting = nowWaiting;
  }

  private notify(): void {
    for (const fn of this.listeners) {
      fn(this.sessions);
    }
  }
}

// Sync readdir fallback for hot path
function readdirSync(dir: string): string[] {
  try {
    return fsReaddirSync(dir);
  } catch {
    return [];
  }
}
