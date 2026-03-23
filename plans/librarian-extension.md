# Librarian Pi Extension

Create a "Librarian" extension modeled on [pi-librarian](https://github.com/default-anton/pi-librarian) — a GitHub research subagent that uses `gh` CLI for code investigation.

## What it does (same as upstream)

- Registers a `librarian` tool that spawns a dedicated subagent session
- Subagent uses `bash` + `read` tools with `gh` CLI for GitHub code search, tree browsing, and file fetching
- Works in an isolated `/tmp/pi-librarian/run-*` workspace
- Fixed turn budget (default 10 turns) enforced via inner extension
- Returns the subagent's final Markdown answer as-is
- Model selection via configurable failover chain with `ctx.model` fallback
- Temporary unavailability tracking with TTLs (30min quota, 10min error)
- Custom TUI rendering showing progress, tool calls, model info

## Functional changes from upstream

1. **Settings-based configuration**: Model failover, max turns, and max search results are configurable via `settings.json` under a `librarian` namespace (global + project merge), with env var fallback (`PI_LIBRARIAN_MODELS`, `PI_LIBRARIAN_MAX_TURNS`, `PI_LIBRARIAN_MAX_SEARCH_RESULTS`). Uses the same manual JSON merge pattern as `pi-self-learning`.
2. **Removed `pi-subdir-context` dependency**: The upstream loads this as an additional extension in the subagent. While it could inject AGENTS.md from cached repos, it's an external dependency that may not be installed. Removed to keep self-contained.
3. **Cleaner type handling**: Removed `(params as any)` casts — uses `Static<typeof LibrarianParams>` for proper typing.
4. **Removed EventTarget max listener workaround**: The upstream manages global `events.defaultMaxListeners` state. Removed as likely a framework workaround that may no longer be needed.
5. **Simplified model selection code**: Same failover behavior but with cleaner naming and reduced code surface.
6. **Extracted `buildFinalResult` helper**: Deduplicates the final result construction that was repeated in multiple code paths.

## File structure

```
home/private_dot_pi/private_agent/extensions/librarian/
├── index.ts              # Main extension entry point + tool registration + TUI rendering
├── librarian-core.ts     # Types, utilities, constants, parameter schema
├── librarian-prompts.ts  # System and user prompt builders
├── librarian-settings.ts # Settings loading (settings.json + env var fallback)
└── model-selection.ts    # Model failover logic with temporary unavailability tracking
```

## Settings example

```json
{
  "librarian": {
    "models": "anthropic/claude-sonnet-4-5:high,openai/gpt-5.4:medium",
    "maxTurns": 12,
    "maxSearchResults": 50
  }
}
```

## Implementation checklist

- [x] Create `librarian/librarian-core.ts` — types, constants, utility functions
- [x] Create `librarian/librarian-prompts.ts` — system and user prompt builders
- [x] Create `librarian/librarian-settings.ts` — settings loading with JSON merge
- [x] Create `librarian/model-selection.ts` — model failover with availability tracking
- [x] Create `librarian/index.ts` — main extension with tool registration, subagent orchestration, TUI rendering
