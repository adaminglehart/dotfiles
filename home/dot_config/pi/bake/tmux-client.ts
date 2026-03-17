import { $ } from "bun";

export const TMUX_SOCKET = "pi-agents";
export const TMUX_SESSION = "agents";

export interface TmuxWindow {
  index: number;
  name: string;
  active: boolean;
  paneCurrentCommand: string;
  panePid: number;
}

async function tmux(...args: string[]): Promise<string> {
  const result = await $`tmux -L ${TMUX_SOCKET} ${args}`.quiet().nothrow();
  return result.stdout.toString();
}

export async function hasSession(): Promise<boolean> {
  const result = await $`tmux -L ${TMUX_SOCKET} has-session -t ${TMUX_SESSION}`.quiet().nothrow();
  return result.exitCode === 0;
}

export async function listWindows(): Promise<TmuxWindow[]> {
  if (!(await hasSession())) return [];

  const fmt = "#{window_index}:#{window_name}:#{window_active}:#{pane_current_command}:#{pane_pid}";
  const out = await tmux("list-windows", "-t", TMUX_SESSION, "-F", fmt);

  return out
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [index, name, active, paneCurrentCommand, panePid] = line.split(":");
      return {
        index: parseInt(index, 10),
        name,
        active: active === "1",
        paneCurrentCommand,
        panePid: parseInt(panePid, 10),
      };
    });
}

export async function selectWindow(name: string): Promise<void> {
  await tmux("select-window", "-t", `${TMUX_SESSION}:${name}`);
}

export async function killWindow(name: string): Promise<void> {
  if (!(await hasSession())) return;
  await tmux("kill-window", "-t", `${TMUX_SESSION}:${name}`);
}

export async function newWindow(name: string, dir: string, command: string): Promise<void> {
  if (await hasSession()) {
    await tmux("new-window", "-d", "-t", TMUX_SESSION, "-n", name, "-c", dir, command);
  } else {
    await tmux("new-session", "-d", "-s", TMUX_SESSION, "-n", name, "-c", dir, command);
  }
}

export async function attachSession(): Promise<void> {
  // Replace current process with tmux attach
  const proc = Bun.spawn(
    ["tmux", "-L", TMUX_SOCKET, "attach", "-t", TMUX_SESSION],
    { stdio: ["inherit", "inherit", "inherit"] }
  );
  await proc.exited;
  process.exit(proc.exitCode ?? 0);
}

export async function windowExists(name: string): Promise<boolean> {
  const windows = await listWindows();
  return windows.some((w) => w.name === name);
}
