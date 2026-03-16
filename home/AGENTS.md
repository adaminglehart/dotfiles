# AGENTS.md

# Instructions

Whenever corrected, after making a mistake or misinterpreting, add a section in here (~/AGENTS.md) to instruct future sessions, avoiding the mistake again. 

ALWAYS use subagents where possible, prefer to parallelize work when it does not create conflicts.

## System Facts

- Shell: Fish
- Dotfiles managed by Chezmoi — always edit source files in ~/dev/dotfiles, not the installed copies
- Git workflow uses Graphite (`gt create`, `gt submit`, etc.), not raw git branching
- Commit messages: imperative mood ("Add X" not "Added X"), small and focused

## Preferences

- Re-read files before editing — I often make manual changes between your turns
- Only do what I asked. Don't add features, refactor surrounding code, or "improve" things unprompted. Do call out opportunities for improvements when you see them, just don't make them without discussion.
- Push back if I'm approaching something wrong — don't just agree
- When requesting permanent tool permissions, scope them tightly (e.g. `kubectl get pods *` not `kubectl *`)

## Tool Usage

- NEVER use `grep` or `rg` via Bash — always use the built-in Grep tool instead
- NEVER use `cat`, `head`, `tail` via Bash — use the Read tool
- NEVER use `find` or `ls` for file searches — use the Glob tool
- These dedicated tools provide better UX and review experience
- when you're waiting for some action to complete or state to change, use a polling approach rather than a long sleep, as long as it's safe to do so

## Coding best practices

- preferred languages: typescript, golang
- minimal comments, only for non-obvious code
- prioritize clean and maintanable over quick and hacky
- if you install a dependency to a project, make sure you are installing the latest version, unless you specifically need an older version.
- for typed languages, always prefer strong typing, never use any or unknown unless there's no other option.
- When asked to implement something, start writing code immediately. Do not spend more than 2-3 minutes exploring the codebase before making changes. If you need more context, ask the user rather than exploring endlessly.
- Keep implementations simple and concrete. Do not introduce unnecessary abstractions, generic types, callback patterns, or over-engineered options objects. If a value is directly available (e.g., a timestamp on a record), use it directly rather than creating indirection layers.

## Agent Memory

At the start of each session, use the `recall project <project name>` skill to check if a project context note exists at
for the current working directory (by last path component). If found, read it silently for context.
Do not perform deep searches automatically.
