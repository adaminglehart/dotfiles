import type { Session } from "../session-store.ts";

export interface SessionDetailTheme {
  title: (text: string) => string;
  label: (text: string) => string;
  value: (text: string) => string;
  preview: (text: string) => string;
  dim: (text: string) => string;
  hint: (text: string) => string;
}

export class SessionDetail {
  private session: Session | null = null;

  constructor(private theme: SessionDetailTheme) {}

  setSession(session: Session | null): void {
    this.session = session;
  }

  render(width: number): string[] {
    const lines: string[] = [];

    if (!this.session) {
      lines.push(this.theme.dim("  No session selected"));
      return lines;
    }

    const s = this.session;
    const pad = "  ";

    lines.push(pad + this.theme.title(s.name));
    lines.push("");

    const statusLabel = { working: "working", waiting: "waiting for input", idle: "idle" }[s.status];
    lines.push(pad + this.theme.label("Status:  ") + this.theme.value(statusLabel));

    if (s.lastActivity) {
      lines.push(pad + this.theme.label("Active:  ") + this.theme.value(formatRelativeTime(s.lastActivity)));
    }

    if (s.lastMessage) {
      lines.push("");
      lines.push(pad + this.theme.label("Last message:"));
      const wrapped = wrapText(s.lastMessage, width - 4);
      for (const line of wrapped.slice(0, 5)) {
        lines.push(pad + this.theme.preview(line));
      }
    }

    lines.push("");
    lines.push(
      pad +
        this.theme.hint("<enter> focus  ") +
        this.theme.hint("n new  ") +
        this.theme.hint("k kill  ") +
        this.theme.hint("q quit")
    );

    return lines;
  }
}

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function wrapText(text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (current.length + word.length + 1 > maxWidth && current.length > 0) {
      lines.push(current);
      current = word;
    } else {
      current = current.length > 0 ? `${current} ${word}` : word;
    }
  }

  if (current) lines.push(current);
  return lines;
}
