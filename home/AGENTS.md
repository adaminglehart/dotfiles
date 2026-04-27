# AGENTS.md

**Top-level agent guidelines for all coding sessions.**

See also:
- **Dotfiles Repo:** `~/dev/dotfiles/AGENTS.md` (Chezmoi conventions and configuration management)

# Instructions

Whenever corrected, after making a mistake or misinterpreting, add a section in here (~/dev/dotfiles/home/AGENTS.md) to instruct future sessions, avoiding the mistake again. Only do this if it's a generalizable mistake, don't add one-offs.

ALWAYS use subagents where possible, prefer to parallelize work when it does not create conflicts.

## System Facts

- Shell: Fish
- Dotfiles managed by Chezmoi — always edit source files in ~/dev/dotfiles, not the installed copies
- any time you're going to edit a file in ~ (the home directory), first check if it's managed by our dotfiles or pi-config. If it is, edit the file in the source repo instead
- Git workflow uses Graphite (`gt create`, `gt submit`, etc.), not raw git
- Commit messages: imperative mood ("Add X" not "Added X"), small and focused

## Preferences

- Re-read files before editing — I often make manual changes between your edits
- Only do what I asked. Don't add features, refactor surrounding code, or "improve" things unprompted. Do call out opportunities for improvements when you see them, just don't make them without discussion.
- Push back if I'm approaching something wrong — don't just agree
- When requesting permanent tool permissions, scope them tightly (e.g. `kubectl get pods *` not `kubectl *`)
- **Destructive Operations** — NEVER run `terraform apply`, `kubectl delete`, etc. without explicit approval
- if I ask you to do something involving an external library, SDK, API, tool, etc you should always look up the documentation to ensure your information is up to date

## Tool Usage
- prefer ripgrep (rg) over regular grep
- when you're waiting for some action to complete or state to change, use a polling approach rather than a long sleep, as long as it's safe to do so
- If you ever need to do some work in another panel, use tmux rather than zellij, even though I use zellij for my main workflow. 

## Coding best practices

- preferred languages: typescript, golang
- prioritize clean and maintainable over quick and hacky
- **important** if you install a dependency to a project, make sure you are installing the latest version, unless you specifically need an older version.
- **important** for typed languages, always prefer strong typing, never use `any` or `unknown`.
- When asked to implement something, start writing code immediately. Do not spend more than 2-3 minutes exploring the codebase before making changes. If you need more context, ask the user rather than exploring endlessly.
- Keep implementations simple and concrete. Do not introduce unnecessary abstractions, generic types, callback patterns, or over-engineered options objects. If a value is directly available (e.g., a timestamp on a record), use it directly rather than creating indirection layers.
- Avoid general utils files (e.g. utils.ts) - prefer specifically broken-out and named files for shared code

## Corrections

- When adding `mise` tool versions, prefer the latest stable version unless the repo explicitly requires a pinned older release.
- Before debugging a service, confirm the active deployment target (e.g. Docker vs Kubernetes) instead of inferring it from past project context.
- Never use broad wildcard cleanup commands like `rm -rf * .*` while restructuring or repairing a repository. Move the specific checkout aside and reclone, or delete only verified paths.

### Pi agent
- Pi config lives in ~/dev/pi-config (separate repo, all pi agent configuration should be done there)
- Never edit `~/.pi/agent/*` directly when the file is managed by `~/dev/pi-config`; update the source repo first.
- For Pi config changes, prefer the repo's own apply flow (`cd ~/dev/pi-config && just apply`) instead of writing rendered files by hand.
