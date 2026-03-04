# AGENTS.md

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

## Coding best practices

- preferred languages: typescript, golang
- minimal comments, only for non-obvious code
- prioritize clean and maintanable over quick and hacky

## Agent Memory

At the start of each session, check if a project context note exists at
`~/Documents/obsidian/agents/agents/projects/` matching the current working
directory (by last path component). If found, read it silently for context.
Do not perform deep searches automatically.
