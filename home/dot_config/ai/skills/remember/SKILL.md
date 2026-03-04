# /remember — Save context to agent memory

Persist facts, project context, and working notes to the Obsidian agents vault.

## Usage

- `/remember memory <text>` — Save a persistent fact or preference
- `/remember project` — Create or update a project context note for the current working directory
- `/remember scratch <text>` — Save an ephemeral working note

## Instructions

### Memory (`/remember memory <text>`)

1. Determine if the text relates to a specific topic or is general:
   - If clearly about a specific topic (e.g., "prefers Fish shell" → `shell.md`, "uses Graphite for PRs" → `git.md`), use a topic-specific file
   - Otherwise, use `general.md`
2. Target file: `~/Documents/obsidian/agents/agents/memories/<filename>.md`
3. If the file exists, read it first, then append. If not, create it with a `# <Topic>` heading.
4. Append format: `- <text> *(YYYY-MM-DD)*`
5. Avoid duplicates — scan existing entries before appending

### Project (`/remember project`)

1. Derive project slug from the current working directory (last path component, e.g., `pay-server`)
2. Target file: `~/Documents/obsidian/agents/agents/projects/<slug>.md`
3. If the file exists, read it and ask what should be updated
4. If creating new, gather and write:

```markdown
---
project: <slug>
path: <full working directory>
updated: YYYY-MM-DD
---

# <Project Name>

## Overview
<Brief description of the project>

## Architecture
<Key architectural decisions and patterns>

## Open Questions
<Unresolved decisions or unknowns>

## TODOs
<Active work items>
```

5. Keep it concise — this is a quick-reference note, not full documentation

### Scratch (`/remember scratch <text>`)

1. Target file: `~/Documents/obsidian/agents/agents/scratch/<YYYY-MM-DD>_<slug>.md`
   - Slug derived from first few words of text (lowercase, hyphens, max 30 chars)
2. If a scratch file for today with a similar slug exists, append to it
3. Otherwise create a new file with the content
4. These are ephemeral — meant to be cleaned up periodically

### After Writing

Always run `qmd update` after writing any file to keep the search index fresh.

## Paths

- Memories: `~/Documents/obsidian/agents/agents/memories/`
- Projects: `~/Documents/obsidian/agents/agents/projects/`
- Scratch: `~/Documents/obsidian/agents/agents/scratch/`
- QMD CLI: `qmd`
