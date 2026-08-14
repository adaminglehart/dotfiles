import type { Session, SessionStatus } from "../session-store.ts";

export interface SessionListTheme {
  selected: (text: string) => string;
  normal: (text: string) => string;
  statusWorking: (text: string) => string;
  statusWaiting: (text: string) => string;
  statusIdle: (text: string) => string;
  dim: (text: string) => string;
}

export class SessionList {
  private sessions: Session[] = [];
  private selectedIndex = 0;
  onSelect?: (session: Session) => void;
  onSelectionChange?: (session: Session) => void;

  constructor(private theme: SessionListTheme) {}

  setSessions(sessions: Session[]): void {
    this.sessions = sessions;
    if (this.selectedIndex >= sessions.length && sessions.length > 0) {
      this.selectedIndex = sessions.length - 1;
    }
  }

  setSelectedByName(name: string): void {
    const idx = this.sessions.findIndex((s) => s.name === name);
    if (idx >= 0) this.selectedIndex = idx;
  }

  getSelected(): Session | null {
    return this.sessions[this.selectedIndex] ?? null;
  }

  handleInput(data: string): boolean {
    if (this.sessions.length === 0) return false;

    if (data === "\x1b[A" || data === "k") {
      // Up
      if (this.selectedIndex > 0) {
        this.selectedIndex--;
        this.onSelectionChange?.(this.sessions[this.selectedIndex]);
      }
      return true;
    }

    if (data === "\x1b[B" || data === "j") {
      // Down
      if (this.selectedIndex < this.sessions.length - 1) {
        this.selectedIndex++;
        this.onSelectionChange?.(this.sessions[this.selectedIndex]);
      }
      return true;
    }

    if (data === "\r" || data === "\n") {
      const sel = this.getSelected();
      if (sel) this.onSelect?.(sel);
      return true;
    }

    return false;
  }

  render(width: number): string[] {
    const lines: string[] = [];

    if (this.sessions.length === 0) {
      lines.push(this.theme.dim("  No sessions"));
      return lines;
    }

    const maxVisible = 20;
    let start = Math.max(0, this.selectedIndex - Math.floor(maxVisible / 2));
    const end = Math.min(this.sessions.length, start + maxVisible);
    if (end - start < maxVisible) start = Math.max(0, end - maxVisible);

    for (let i = start; i < end; i++) {
      const session = this.sessions[i];
      const isSelected = i === this.selectedIndex;
      const badge = this.statusBadge(session.status);
      const nameWidth = width - 4;
      const name = session.name.slice(0, nameWidth);

      const line = ` ${badge} ${name}`;
      lines.push(isSelected ? this.theme.selected(line) : this.theme.normal(line));
    }

    return lines;
  }

  private statusBadge(status: SessionStatus): string {
    switch (status) {
      case "working":
        return this.theme.statusWorking("●");
      case "waiting":
        return this.theme.statusWaiting("●");
      case "idle":
        return this.theme.statusIdle("○");
    }
  }
}
