# bake: Agent Session Management TUI

## Context

A standalone TypeScript TUI that replaces `pi-session` as the primary entry point for managing pi agent sessions. Each session is a Docker container running `pi`, held as a tmux window inside a dedicated tmux session (`agents`) on a private socket (`-L pi-agents`). The manager sits outside all of that, observing and controlling it.

## Goals

- Single terminal app opened instead of `pi-session attach`
- Persistent session list with live status (idle, working, waiting for input)
- Keyboard + mouse interactive: switch focus, start, kill sessions
- Hackable and extensible in TypeScript
- Built on `@mariozechner/pi-tui` (already in stack, same toolkit pi uses)
- V1 switching = `tmux select-window` (focus the tmux window); pane embedding is a later milestone

---

## Architecture

### Tech stack

- **Runtime:** Bun (no compile step, first-class TypeScript)
- **TUI framework:** `@mariozechner/pi-tui` — `SelectList`, keyboard input, layout primitives
- **Data sources:**
  - `tmux -L pi-agents list-windows` — live process state, window names
  - `~/.pi/agent/sessions/` JSONL files — session names, last message, last activity (mounted into containers so readable from host)
  - `~/.pi/agent/status/<session-name>.json` — written by pi extension on `agent_start`/`agent_end` events (precise idle detection)
- **Session control:** thin shell-outs to `tmux -L pi-agents` subcommands

### File layout

```
home/dot_local/bin/
  executable_bake               # entry point (replaces `pi-session`)

home/dot_config/pi/bake/
  index.ts                      # TUI bootstrap, layout, event loop
  session-store.ts              # polls tmux + watches JSONL/status files, emits session state
  tmux-client.ts                # typed wrappers: listWindows, selectWindow, newWindow, killWindow
  docker-client.ts              # typed wrappers: run container, kill container (ported from pi-session)
  notify.ts                     # macOS notification on waiting-for-input state transition
  pi-extension/
    status-writer.ts            # pi extension: writes status file on agent_start/agent_end
  components/
    session-list.ts             # left panel: list of sessions with status badges
    session-detail.ts           # right panel: name, dir, model, last message preview
```

### Layout (v1)

```
┌──────────────────┬─────────────────────────────────────┐
│ ● auth-refactor  │  auth-refactor                      │
│   api-work       │  ~/dev/myproject                    │
│   docs-update    │  anthropic/claude-sonnet-4-6        │
│                  │                                     │
│                  │  Last activity: 14s ago             │
│                  │  "I've updated the JWT validation   │
│                  │   logic and added tests for..."     │
│                  │                                     │
│ n:new  k:kill    │  <enter> focus    ctrl+c: kill      │
└──────────────────┴─────────────────────────────────────┘
```

Status badges:
- `●` yellow — waiting for input (agent idle, from pi extension status file)
- `●` green — actively working (tmux pane has running process)
- `○` dim — idle / quiet

### Session state detection

Accurate status via a small pi extension (`status-writer.ts`) that writes `~/.pi/agent/status/<session-name>.json` on `agent_start` and `agent_end` events. This file is mounted/readable from host, giving `bake` precise idle/working state without heuristics.

---

## Implementation plan

- [DONE] **Phase 1 — scaffold + tmux data layer**
  - [DONE] Create `tmux-client.ts`: `listWindows()`, `selectWindow(name)`, `killWindow(name)`, `newWindow(name, dir, cmd)`
  - [DONE] Create `session-store.ts`: poll tmux every 1s, expose reactive session list
  - [DONE] Wire JSONL parsing: for each window, find matching session file by cwd, extract last message + timestamp
  - [DONE] Read `~/.pi/agent/status/<session-name>.json` for precise idle/working state
  - [ ] Unit-test data layer with mock tmux output

- [DONE] **Phase 2 — pi extension for status**
  - [DONE] Create `pi-extension/status-writer.ts`: register `agent_start` / `agent_end` hooks, write status JSON to `~/.pi/agent/status/<session-name>.json`
  - [DONE] Wire extension into pi config / container setup (`settings.json.tmpl`)
  - [ ] Validate status file is readable from host (validate after first live session)

- [DONE] **Phase 3 — TUI layout**
  - [DONE] Bootstrap `index.ts` with raw-mode terminal render loop
  - [DONE] Implement `session-list.ts` component: list with status badges, keyboard nav
  - [DONE] Implement `session-detail.ts` component: metadata panel, last message preview
  - [DONE] Two-panel layout, responsive to terminal width
  - [ ] Mouse support for list selection (future polish)

- [DONE] **Phase 4 — actions**
  - [DONE] `<enter>` → `tmux select-window` to focus selected session
  - [DONE] `n` → prompt for name, use `docker-client.ts` to spin up container + tmux window
  - [DONE] `k` → confirm prompt, kill window + docker container

- [DONE] **Phase 5 — notifications**
  - [DONE] Create `notify.ts`: osascript wrapper, trigger on `waiting-for-input` state transitions
  - [DONE] Debounce: only notify once per session per idle transition (suppress repeat fires)
  - [DONE] Wire into `session-store.ts` state diff loop

- [DONE] **Phase 6 — replace pi-session entirely**
  - [DONE] Port all Docker run logic from `pi-session` bash script into `docker-client.ts`
  - [DONE] Port `pi-session new` (container setup, env, mounts, tmux window creation) into `bake new` action
  - [DONE] Port `pi-session attach` into `bake` TUI default entry
  - [DONE] Port `pi-session list` into `bake ls`
  - [ ] Delete `pi-session` bash script from dotfiles (do manually after validating bake in prod)

- [DONE] **Phase 7 — entry point + dotfiles wiring**
  - [DONE] Write `executable_bake` Bun entry point (`bun run ~/.config/pi/bake/index.ts`)
  - [DONE] Add `package.json` with deps
  - [DONE] Chezmoi-manage all new files + `.chezmoiignore` for node_modules
  - [DONE] `chezmoi apply` — all files deployed to `~`

---

## Open questions / future milestones

- **Pane embedding:** Rendering the actual pi terminal output inline (replacing the detail panel). Requires `tmux capture-pane -e` for display + input forwarding via `tmux send-keys`. Significant complexity; post-v1.
- **New session wizard:** Guided prompt for name, dir, model, worktree branch.
