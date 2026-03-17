#!/usr/bin/env bun
/**
 * bake - pi agent session manager TUI
 *
 * Usage:
 *   bake              # Open TUI session manager (attach mode)
 *   bake new <name> [--model <m>] [--dir <d>] [--no-sandbox] [--worktree <branch>]
 *   bake ls           # List sessions
 *   bake kill <name>  # Kill a session
 *   bake attach       # Attach to tmux session
 */

import * as readline from "node:readline";
import { attachSession, hasSession, killWindow, listWindows, newWindow, selectWindow, windowExists } from "./tmux-client.ts";
import { DEFAULT_MODEL, killContainer, prepareSession } from "./docker-client.ts";
import { SessionStore } from "./session-store.ts";
import { SessionList } from "./components/session-list.ts";
import { SessionDetail } from "./components/session-detail.ts";

// ─── ANSI helpers ────────────────────────────────────────────────────────────

const ESC = "\x1b";
const ansi = {
  reset: `${ESC}[0m`,
  bold: (s: string) => `${ESC}[1m${s}${ESC}[0m`,
  dim: (s: string) => `${ESC}[2m${s}${ESC}[0m`,
  green: (s: string) => `${ESC}[32m${s}${ESC}[0m`,
  yellow: (s: string) => `${ESC}[33m${s}${ESC}[0m`,
  cyan: (s: string) => `${ESC}[36m${s}${ESC}[0m`,
  white: (s: string) => `${ESC}[97m${s}${ESC}[0m`,
  bgSelected: (s: string) => `${ESC}[48;5;238m${ESC}[97m${s}${ESC}[0m`,
  clearScreen: () => process.stdout.write(`${ESC}[2J${ESC}[H`),
  hideCursor: () => process.stdout.write(`${ESC}[?25l`),
  showCursor: () => process.stdout.write(`${ESC}[?25h`),
  moveTo: (row: number, col: number) => process.stdout.write(`${ESC}[${row};${col}H`),
  clearLine: () => process.stdout.write(`${ESC}[2K`),
  enableMouse: () => process.stdout.write(`${ESC}[?1000h${ESC}[?1006h`),
  disableMouse: () => process.stdout.write(`${ESC}[?1000l${ESC}[?1006l`),
};

// ─── CLI dispatch ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const command = args[0] ?? "";

switch (command) {
  case "new":
    await cmdNew(args.slice(1));
    break;
  case "ls":
    await cmdList();
    break;
  case "kill":
    await cmdKill(args[1]);
    break;
  case "attach":
    await cmdAttach();
    break;
  case "":
    await runTUI();
    break;
  default:
    printUsage();
    process.exit(1);
}

// ─── Commands ────────────────────────────────────────────────────────────────

async function cmdNew(argv: string[]): Promise<void> {
  const name = argv[0];
  if (!name) {
    printUsage();
    process.exit(1);
  }

  if (!isValidName(name)) {
    console.error("Session names may only contain letters, numbers, dot, underscore, and dash.");
    process.exit(1);
  }

  if (await windowExists(name)) {
    console.error(`A session named ${name} already exists.`);
    process.exit(1);
  }

  let model = DEFAULT_MODEL;
  let dir: string | undefined;
  let sandbox = true;
  let worktreeBranch: string | undefined;

  for (let i = 1; i < argv.length; i++) {
    switch (argv[i]) {
      case "--model":
        model = argv[++i];
        break;
      case "--dir":
        dir = argv[++i];
        break;
      case "--no-sandbox":
        sandbox = false;
        break;
      case "--worktree":
        worktreeBranch = argv[++i];
        break;
      default:
        console.error(`Unknown flag: ${argv[i]}`);
        process.exit(1);
    }
  }

  const { workdir, command } = await prepareSession({ name, model, dir, sandbox, worktreeBranch });
  await newWindow(name, workdir, command);
  console.log(`Started ${name} in ${workdir}`);
  await cmdAttach();
}

async function cmdList(): Promise<void> {
  const windows = await listWindows();
  if (windows.length === 0) {
    console.log("No active pi sessions.");
    return;
  }
  for (const w of windows) {
    console.log(`${w.index}  ${w.name}`);
  }
}

async function cmdKill(name: string | undefined): Promise<void> {
  if (!name) {
    printUsage();
    process.exit(1);
  }
  await killWindow(name);
  await killContainer(name);
}

async function cmdAttach(): Promise<void> {
  if (!(await hasSession())) {
    console.error("No active pi sessions.");
    process.exit(1);
  }
  await attachSession();
}

// ─── TUI ─────────────────────────────────────────────────────────────────────

async function runTUI(): Promise<void> {
  const store = new SessionStore();

  const listTheme = {
    selected: (s: string) => ansi.bgSelected(s),
    normal: (s: string) => s,
    statusWorking: (s: string) => ansi.green(s),
    statusWaiting: (s: string) => ansi.yellow(s),
    statusIdle: (s: string) => ansi.dim(s),
    dim: (s: string) => ansi.dim(s),
  };

  const detailTheme = {
    title: (s: string) => ansi.bold(ansi.white(s)),
    label: (s: string) => ansi.dim(s),
    value: (s: string) => ansi.white(s),
    preview: (s: string) => ansi.dim(s),
    dim: (s: string) => ansi.dim(s),
    hint: (s: string) => ansi.dim(s),
  };

  const list = new SessionList(listTheme);
  const detail = new SessionDetail(detailTheme);

  list.onSelectionChange = (s) => detail.setSession(s);

  let dirty = true;
  let running = true;
  let confirmKill: string | null = null;
  let promptNew = false;
  let newNameInput = "";

  store.subscribe((sessions) => {
    const prevSelected = list.getSelected();
    list.setSessions(sessions);
    if (prevSelected) list.setSelectedByName(prevSelected.name);
    detail.setSession(list.getSelected());
    dirty = true;
  });

  store.start(1000);

  // Terminal setup
  ansi.clearScreen();
  ansi.hideCursor();
  ansi.enableMouse();

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();

  const teardown = () => {
    running = false;
    store.stop();
    ansi.showCursor();
    ansi.disableMouse();
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.stdin.pause();
    ansi.clearScreen();
  };

  const cleanup = () => {
    teardown();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  // Input handling
  process.stdin.on("data", async (buf: Buffer) => {
    const data = buf.toString();

    if (promptNew) {
      if (data === "\r" || data === "\n") {
        const name = newNameInput.trim();
        newNameInput = "";
        promptNew = false;
        if (name && isValidName(name)) {
          teardown();
          await prepareAndLaunch(name);
          process.exit(0);
        }
        dirty = true;
        return;
      }
      if (data === "\x7f") {
        newNameInput = newNameInput.slice(0, -1);
      } else if (data === "\x03" || data === "\x1b") {
        newNameInput = "";
        promptNew = false;
      } else if (data.length === 1 && data >= " ") {
        newNameInput += data;
      }
      dirty = true;
      return;
    }

    if (confirmKill !== null) {
      if (data === "y" || data === "Y") {
        const name = confirmKill;
        confirmKill = null;
        await killWindow(name);
        await killContainer(name);
      } else {
        confirmKill = null;
      }
      dirty = true;
      return;
    }

    // Main keybindings
    if (data === "q" || data === "\x03") {
      cleanup();
      return;
    }

    if (data === "n") {
      promptNew = true;
      newNameInput = "";
      dirty = true;
      return;
    }

    if (data === "k") {
      const sel = list.getSelected();
      if (sel) {
        confirmKill = sel.name;
        dirty = true;
      }
      return;
    }

    if (list.handleInput(data)) {
      dirty = true;
      return;
    }

    // Enter: focus selected session in tmux
    if (data === "\r" || data === "\n") {
      const sel = list.getSelected();
      if (sel) {
        teardown();
        await selectWindow(sel.name);
        await attachSession();
        process.exit(0);
      }
    }
  });

  // Render loop
  const render = () => {
    if (!dirty || !running) return;
    dirty = false;

    const width = process.stdout.columns ?? 80;
    const height = process.stdout.rows ?? 24;
    const leftWidth = Math.max(20, Math.floor(width * 0.35));
    const rightWidth = width - leftWidth - 1;

    const leftLines = list.render(leftWidth);
    const rightLines = detail.render(rightWidth);
    const maxRows = height - 2;

    // Header row 1
    ansi.moveTo(1, 1);
    const headerText = ansi.bold(ansi.cyan(" bake")) + ansi.dim(" — pi session manager");
    process.stdout.write(headerText + " ".repeat(Math.max(0, width - stripAnsi(headerText).length)));

    // Header row 2 (divider)
    ansi.moveTo(2, 1);
    process.stdout.write(ansi.dim("─".repeat(leftWidth) + "┬" + "─".repeat(rightWidth)));

    // Body — use explicit moveTo per row, no \n to avoid scroll
    for (let row = 0; row < maxRows; row++) {
      ansi.moveTo(row + 3, 1);
      const leftLine = leftLines[row] ?? "";
      const rightLine = rightLines[row] ?? "";

      const paddedLeft = padAnsi(leftLine, leftWidth);
      const paddedRight = padAnsi(rightLine, rightWidth);
      process.stdout.write(paddedLeft + ansi.dim("│") + paddedRight);
    }

    // Status bar
    ansi.moveTo(height, 1);
    let statusLine: string;
    if (promptNew) {
      statusLine = ansi.cyan(" New session name: ") + newNameInput + "█";
    } else if (confirmKill !== null) {
      statusLine = ansi.yellow(` Kill "${confirmKill}"? (y/N) `);
    } else {
      statusLine = ansi.dim(" ↑↓/jk select  enter focus  n new  k kill  q quit");
    }
    process.stdout.write(statusLine + " ".repeat(Math.max(0, width - stripAnsi(statusLine).length)));
  };

  const renderInterval = setInterval(render, 50);
  (renderInterval as unknown as { unref(): void }).unref?.();

  // Keep process alive
  await new Promise<void>((resolve) => {
    const check = setInterval(() => {
      if (!running) {
        clearInterval(check);
        clearInterval(renderInterval);
        resolve();
      }
    }, 100);
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidName(name: string): boolean {
  return /^[A-Za-z0-9._-]+$/.test(name);
}

function padAnsi(str: string, width: number): string {
  const visible = stripAnsi(str).length;
  const pad = Math.max(0, width - visible);
  return str + " ".repeat(pad);
}

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

async function prepareAndLaunch(name: string): Promise<void> {
  try {
    const { workdir, command } = await prepareSession({ name });
    await newWindow(name, workdir, command);
    console.log(`Started ${name} in ${workdir}`);
    await attachSession();
  } catch (e: unknown) {
    console.error(`Failed to start session: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
}

function printUsage(): void {
  console.log(`Usage:
  bake                                          Open TUI session manager
  bake new <name> [--model <m>] [--dir <d>]    Create a new session
               [--no-sandbox] [--worktree <b>]
  bake ls                                       List sessions
  bake kill <name>                              Kill a session
  bake attach                                   Attach to tmux session`);
}
