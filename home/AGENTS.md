# AGENTS.md

**Top-level agent guidelines for all coding sessions.**

See also:
- **Dotfiles Repo:** `~/dev/dotfiles/AGENTS.md` (Chezmoi conventions and configuration management)

# Instructions

Whenever corrected, after making a mistake or misinterpreting, add a section in here (~/dev/dotfiles/home/AGENTS.md) to instruct future sessions, avoiding the mistake again. Only do this if it's a generalizable mistake, don't add one-offs.

# Communication

- Only report to me in ASD-STE100 Simplified Technical English.

## System Facts

- Shell: Fish
- Dotfiles managed by Chezmoi — always edit source files in ~/dev/dotfiles, not the installed copies
- any time you're going to edit a file in ~ (the home directory), first check if it's managed by our dotfiles or pi-config. If it is, edit the file in the source repo instead

## Preferences

- Re-read files before editing — I often make manual changes between your edits
- Only do what I asked. Don't add features, refactor surrounding code, or "improve" things unprompted. Do call out opportunities for improvements when you see them, just don't make them without discussion.
- Push back if I'm approaching something wrong — don't just agree
- **Destructive Operations** — NEVER run `terraform apply`, `kubectl delete`, etc. without explicit approval
- if I ask you to do something involving an external library, SDK, API, tool, etc you should always look up the documentation to ensure your information is up to date

## Tool Usage
- prefer ripgrep (rg) over regular grep
- when you're waiting for some action to complete or state to change, use a polling approach rather than a long sleep, as long as it's safe to do so
- keep searches tightly scoped to the relevant repo/subdirectory; never run broad greps/finds across `~/dev` when a more specific path is available, because it is too slow
- If you ever need to do some work in another panel, use tmux rather than zellij, even though I use zellij for my main workflow. 

## Coding best practices

- preferred languages: typescript, golang
- prioritize clean and maintainable over quick and hacky
- **important** if you install a dependency to a project, make sure you are installing the latest version, unless you specifically need an older version.
- **important** for typed languages, always prefer strong typing, never use `any` or `unknown`.
- Keep implementations simple and concrete. Do not introduce unnecessary abstractions, generic types, callback patterns, or over-engineered options objects. If a value is directly available (e.g., a timestamp on a record), use it directly rather than creating indirection layers.
- Avoid general utils files (e.g. utils.ts) - prefer specifically broken-out and named files for shared code

## Corrections

- Never use broad wildcard cleanup commands like `rm -rf * .*` while restructuring or repairing a repository. Move the specific checkout aside and reclone, or delete only verified paths.
- Never revert, remove, or “clean up” unrelated working-tree changes just because they appear in `git diff`/`git status`. Treat unexpected changes as user-owned unless you can prove you created them; ask before modifying them.
- Never delete newly appearing or unfamiliar files while working; the user often edits or adds files manually in parallel. If such a file causes a problem, inspect it and preserve it where possible, or ask before deleting/moving it.
- When the user scopes cleanup to a deployment/platform (for example Kubernetes), do not remove or modify similarly named resources in other platforms (Nomad, Ansible, Terraform, etc.) unless explicitly requested.
- Before confirming a user's hypothesis about where behavior lives or how code works, verify it against the repository and cite the evidence; do not blindly agree.
- When the user is debugging why a specific command or tool fails, stay on that tool path; do not substitute an equivalent workaround command unless explicitly asked.
- Do not rely on `$SHELL` to detect the user's current interactive shell; it may report the login shell (for example zsh) even when the active shell is Fish. Prefer the parent process or another current-session signal.
- Always bound potentially long-running commands with reasonable timeouts. For Kubernetes and network checks, use options like `kubectl --request-timeout`, `kubectl wait --timeout`, `curl --max-time`, Flux/Helm timeout flags, and tool-level timeouts; avoid interactive flags such as `kubectl run -i` unless explicitly needed.
- When generating or transferring credentials and password digests, parse the tool's exact machine-readable/raw value (not decorated CLI output), use protocol-safe character sets, verify the values as consumed by the target services, and never print secret-derived values during validation.

### Pi agent
- Pi config lives in ~/dev/pi-config (separate repo, all pi agent configuration should be done there)
- Never edit `~/.pi/agent/*` directly when the file is managed by `~/dev/pi-config`; update the source repo first.
- For Pi config changes, prefer the repo's own apply flow (`cd ~/dev/pi-config && just apply`) instead of writing rendered files by hand.
