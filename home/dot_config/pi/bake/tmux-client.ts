import { $ } from "bun";

export const TMUX_SOCKET = "pi-agents";
export const TMUX_SESSION = "agents";
const TMUX_CONF = `${process.env.HOME}/.config/pi/tmux.conf`;

export interface TmuxWindow {
  index: number;
  name: string;
  active: boolean;
  paneCurrentCommand: string;
  panePid: number;
}

// Run a tmux command with the shared socket and config, return stdout.
// Uses Bun.spawn so we can pass args as a proper array (no shell quoting issues).
async function tmux(...args: string[]): Promise<{ stdout: string; exitCode: number }> {
  const proc = Bun.spawn(
    ["tmux", "-L", TMUX_SOCKET, "-f", TMUX_CONF, ...args],
    { stdout: "pipe", stderr: "pipe" }
  );
  await proc.exited;
  const stdout = await new Response(proc.stdout).text();
  return { stdout, exitCode: proc.exitCode ?? 1 };
}

export async function hasSession(): Promise<boolean> {
  const { exitCode } = await tmux("has-session", "-t", TMUX_SESSION);
  return exitCode === 0;
}

export async function listWindows(): Promise<TmuxWindow[]> {
  if (!(await hasSession())) return [];

  const fmt = "#{window_index}:#{window_name}:#{window_active}:#{pane_current_command}:#{pane_pid}";
  const { stdout } = await tmux("list-windows", "-t", TMUX_SESSION, "-F", fmt);

  return stdout
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

export async function newWindow(name: string, dir: string, command: string[]): Promise<void> {
  // tmux new-window/new-session treats the trailing args as the shell command.
  // We pass the command array directly so tmux exec's it without a shell wrapper.
  if (await hasSession()) {
    await tmux("new-window", "-d", "-t", TMUX_SESSION, "-n", name, "-c", dir, ...command);
  } else {
    await tmux("new-session", "-d", "-s", TMUX_SESSION, "-n", name, "-c", dir, ...command);
  }
}

export async function attachSession(): Promise<void> {
  // exec into tmux attach — replaces the current process
  const proc = Bun.spawn(
    ["tmux", "-L", TMUX_SOCKET, "-f", TMUX_CONF, "attach", "-t", TMUX_SESSION],
    { stdio: ["inherit", "inherit", "inherit"] }
  );
  await proc.exited;
  process.exit(proc.exitCode ?? 0);
}

export async function windowExists(name: string): Promise<boolean> {
  const windows = await listWindows();
  return windows.some((w) => w.name === name);
}
