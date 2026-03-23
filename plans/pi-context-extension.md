# Pi Context Pilot Extension

## Goal
Create a Pi extension for agentic context management — letting the AI proactively manage its own context window using git-like primitives (tag, log, checkout). Inspired by [kimi-cli D-Mail](https://github.com/MoonshotAI/kimi-cli/blob/main/src/kimi_cli/tools/dmail/dmail.md) and [pi-context](https://github.com/ttttmr/pi-context/).

## Key Differences from pi-context

| Area | pi-context | Ours | Rationale |
|------|-----------|------|-----------|
| **Activation** | Requires `/acm` command; tools error without it | Always available; `/acm` kept as convenience alias | Less friction |
| **Checkout flow** | Stores `CommandCtx` from `/acm`, uses global mutable `CheckoutParams`, aborts agent mid-turn via `turn_end`, resumes in `agent_end` | Tool queues a `/context-checkout-exec` followUp command via `pi.sendUserMessage`, command handler calls `ctx.navigateTree` cleanly | No global state, no abort hack, uses Pi's intended lifecycle |
| **Tag auto-resolution** | Complex "interesting node" heuristic skipping internal tools | Simplified: default to HEAD, but skip backward past our own tool results/calls so we don't tag `context_log` output | Keep the useful part (avoid tagging internal noise), drop the over-engineering |
| **Skill content** | ~300 lines with 5 verbose recipes | ~150 lines, 3 compact recipes, concise decision matrix | Better LLM comprehension |
| **Error handling** | Sparse | Try/catch around session operations with informative messages | Robustness |
| **Structure** | 2 extension files + utils file + skill | Multi-file extension directory + separate skill | Clean separation of concerns |

## Architecture

### Files to create

```
home/private_dot_pi/private_agent/extensions/
└── context-pilot/
    ├── index.ts                    # Extension entry point: wires tools, commands, events
    ├── utils.ts                    # Shared helpers (formatTokens, resolveTarget, etc.)
    ├── tools/
    │   ├── context-tag.ts          # context_tag tool
    │   ├── context-log.ts          # context_log tool
    │   └── context-checkout.ts     # context_checkout tool
    └── commands/
        └── context-dashboard.ts    # /context TUI overlay command

home/private_dot_pi/private_agent/skills/
└── context-pilot/
    └── SKILL.md                    # Agent instructions for proactive context management
```

### Design: The Checkout Problem

Tools receive `ExtensionContext` which does NOT have `navigateTree()`. Only commands get `ExtensionCommandContext` with that method. pi-context works around this by caching the command context from `/acm` in a global variable — fragile.

**Our approach:** The `context_checkout` tool validates params and prepares the checkout, then uses `pi.sendUserMessage("/context-checkout-exec ...", { deliverAs: "followUp" })` to queue a hidden command that runs after the agent finishes. The command handler has `ExtensionCommandContext` and calls `ctx.navigateTree()` properly.

This matches the pattern from `reload-runtime.ts` example and avoids:
- Global mutable state
- Agent abort mid-turn
- Requiring manual `/acm` activation

## Implementation Checklist

### 1. Extension files

#### `utils.ts` — Shared helpers
- [ ] `formatTokens(n)` — human-readable token counts (1k, 1.2M)
- [ ] `resolveTargetId(sm, target)` — resolve tag names, commit IDs, or `root` to entry IDs via DFS
- [ ] `INTERNAL_TOOLS` constant — list of our tool names for log filtering
- [ ] `isInternalTool(name)` — check if tool name is one of ours
- [ ] `findTagInTree(sm, tagName)` — check tag uniqueness across tree
- [ ] `getEntryRole(entry)` — extract display role (USER, AI, TOOL, SUMMARY, etc.)
- [ ] `getEntryContent(entry, verbose)` — extract one-line content from any entry type

#### Tools

- [ ] **`context_tag` tool** (`tools/context-tag.ts`)
  - Params: `name: string`, `target?: string` (defaults to HEAD/leaf)
  - When no target: walks backward from HEAD, skipping entries from our own tools (context_tag/log/checkout results and assistant messages that only call them) — avoids tagging internal noise like `context_log` output
  - Validates tag name uniqueness
  - Calls `pi.setLabel(id, name)`
  - Returns: `"Created tag '<name>' at <id>"`

- [ ] **`context_log` tool** (`tools/context-log.ts`)
  - Params: `limit?: number` (default 50), `verbose?: boolean` (default false)
  - Context Dashboard HUD: usage %, steps since last tag, nearest tag name
  - Filters to "interesting" entries by default (user messages, tagged entries, summaries, branch points)
  - Verbose mode shows all entries
  - Hidden-count markers between visible entries
  - Format: `* <id> (HEAD, tag: name) [ROLE] <content preview>`

- [ ] **`context_checkout` tool** (`tools/context-checkout.ts`)
  - Params: `target: string`, `message: string`, `backupTag?: string`
  - Validates target exists
  - If `backupTag`, sets label on current leaf
  - Serializes params and queues `/context-checkout-exec <json>` as followUp
  - Returns: `"Checkout initiated to <target>. Navigating..."`

- [ ] **`/context-checkout-exec` command** (internal, hidden from user)
  - Parses JSON args
  - Calls `ctx.navigateTree(targetId, { summarize: false })`
  - Sends follow-up message orienting the agent: "context_checkout complete. Read the summary above."

- [ ] **`/acm` command** (convenience alias)
  - Sends the skill activation message as a followUp
  - Passes through any extra args as a user message

- [ ] **`/context` command** (`commands/context-dashboard.ts`, TUI dashboard overlay)
  - Token breakdown by category (system prompt, tool defs, messages, tool calls/results)
  - Grid visualization (filled/empty blocks)
  - Press any key to dismiss

- [ ] **Event handlers**
  - `session_start`: nothing special needed (tags persist via labels in session entries)

#### `index.ts` — Entry point
- [ ] Import and register all tools from `tools/`
- [ ] Import and register `/context` command from `commands/`
- [ ] Register `/acm` and `/context-checkout-exec` commands (small enough to live inline)

### 2. Skill `SKILL.md`
- [ ] Core philosophy: context window = RAM, session tree = disk
- [ ] The Build → Perceive → Navigate loop
- [ ] Tool reference table (tag, log, checkout)
- [ ] Tagging conventions: `<task-slug>-<phase>` naming
- [ ] Decision matrix: when to tag, when to squash, when to revert
- [ ] Checkout message format: `[Status] + [Reason] + [Changes] + [Next Step]`
- [ ] 3 compact recipes: Miner (immediate squash), Candidate (wait for confirmation), Undo (revert)
- [ ] Anti-patterns table
- [ ] Target: ~150 lines

## Notes
- Extension at `home/private_dot_pi/private_agent/extensions/context-pilot/index.ts` — auto-discovered by Pi as `~/.pi/agent/extensions/context-pilot/index.ts`
- Skill at `home/private_dot_pi/private_agent/skills/context-pilot/SKILL.md` — auto-discovered by Pi as `~/.pi/agent/skills/context-pilot/SKILL.md`
- No `package.json` needed — all imports (`@mariozechner/pi-coding-agent`, `@sinclair/typebox`, `@mariozechner/pi-tui`) are available in Pi runtime
- Follows existing extension patterns in this repo (librarian, smart-router, model-pricing-footer)
