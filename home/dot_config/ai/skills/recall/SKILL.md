# /recall — Retrieve context from agent memory

Recall context from previous sessions, project notes, and saved memories.

## Usage

- `/recall` — Light recall: read the project context note for the current working directory
- `/recall yesterday` / `/recall last week` / `/recall last 3 days` — Temporal recall from session logs
- `/recall <topic>` — Topic search across all memory collections via QMD

## Instructions

### Light Recall (no arguments)

1. Derive a project slug from the current working directory (e.g., `/Users/adam/stripe/dev/pay-server` → `pay-server`)
2. Check for a matching file in `~/Documents/obsidian/agents/agents/projects/` — try `<slug>.md` and partial matches
3. If found, read it and present a brief summary of the project context
4. If not found, say so and suggest using `/remember project` to create one

### Temporal Recall (date arguments)

Recognizes patterns like: `yesterday`, `today`, `last week`, `last N days`, `last N weeks`, `this week`

1. List JSONL files in `~/.claude/projects/` subdirectories
2. Filter by modification date matching the requested time range
3. For each matching session file, read the first ~30 lines to extract:
   - The first user message (for a preview of what the session was about)
   - The session timestamp and working directory from the first message with `cwd`
4. Present results as a list:
   ```
   **2026-03-04 14:58** — dotfiles — "I'd like to improve our system for collaborating..."
   **2026-03-04 10:30** — pay-server — "Fix the webhook retry logic for..."
   ```
5. Offer to expand any session by reading the full exported markdown from `~/Documents/obsidian/agents/agents/sessions/` or the raw JSONL

### Topic Recall (keyword arguments)

1. Run `qmd search "<topic>" -n 5` (BM25 keyword search across all collections)
2. If fewer than 2 results, fall back to `qmd query "<topic>" -n 5` (hybrid search with reranking)
3. For each result, read the file with `qmd get <path>` to get the full content
4. Summarize findings grouped by collection (sessions, memories, projects, scratch)

### "One Thing" Synthesis

Every recall response MUST end with:

> **One Thing:** <the single most important next action based on what was found>

This should be concrete and actionable — not vague advice. If nothing actionable emerges, state what context is missing.

## Paths

- Vault: `~/Documents/obsidian/agents/agents/`
- Session exports: `~/Documents/obsidian/agents/agents/sessions/`
- Native JSONL: `~/.claude/projects/`
- QMD CLI: `qmd`
