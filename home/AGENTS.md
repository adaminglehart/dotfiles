# AGENTS.md

**Top-level agent guidelines for all coding sessions.**

These are my standing rules. They outrank an agent's own prompt guidance. A
repository's own `AGENTS.md` adds project rules on top; it does not cancel these.

See also:
- **Dotfiles repo:** `~/dev/dotfiles/AGENTS.md` (Chezmoi conventions and configuration management)
- **Pi config repo:** `~/dev/pi-config/AGENTS.md` (Pi agent build and deploy)

## Instructions

Whenever corrected, after making a mistake or misinterpreting, add a section in here (~/dev/dotfiles/home/AGENTS.md) to instruct future sessions, avoiding the mistake again. Only do this if it's a generalizable mistake, don't add one-offs.

## Communication

- Only speak to me in ASD-STE100 Simplified Technical English.

## System Facts

- Shell: Fish
- Before editing any file under `~`, check whether a source repo owns it. If one does, edit the source and apply, never the installed copy:
  - `~/dev/dotfiles` (Chezmoi) owns most of `~` and `~/.config`
  - `~/dev/pi-config` owns `~/.pi/agent`
- Agent skills live in two places: `~/dev/dotfiles/home/dot_agents/skills/` (shared across agents) and `~/dev/pi-config/skills/` (Pi only)

## Pi Agent

- Pi config lives in `~/dev/pi-config` (separate repo; do all Pi agent configuration there)
- Never edit `~/.pi/agent/*` directly when `~/dev/pi-config` manages the file; update the source repo first
- For Pi config changes, use the repo's apply flow (`cd ~/dev/pi-config && just apply`) instead of writing rendered files by hand

## Preferences

- Re-read files before editing — I often make manual changes between your edits
- Only do what I asked. Don't add features, refactor surrounding code, or "improve" things unprompted. Do call out opportunities for improvements when you see them, just don't make them without discussion.
- Push back if I'm approaching something wrong — don't just agree
- **Destructive Operations** — NEVER run `terraform apply`, `kubectl delete`, etc. without explicit approval
- if I ask you to do something involving an external library, SDK, API, tool, etc you should always look up the documentation to ensure your information is up to date

## Git

- Never run `git commit`, `git push`, or a Graphite submit command unless I explicitly ask. Ask first, or leave it to me.
- Each repo's own `AGENTS.md` states its branching and PR flow. Follow that, and don't assume a flow that isn't written down.

## Tool Usage

- prefer ripgrep (rg) over regular grep
- when you're waiting for some action to complete or state to change, use a polling approach rather than a long sleep, as long as it's safe to do so
- keep searches tightly scoped to the relevant repo/subdirectory; never run broad greps/finds across `~/dev` when a more specific path is available, because it is too slow
- If you ever need to do some work in another panel, use tmux rather than zellij, even though I use zellij for my main workflow.
- Always bound potentially long-running commands with reasonable timeouts. For Kubernetes and network checks use `kubectl --request-timeout`, `kubectl wait --timeout`, `curl --max-time`, Flux/Helm timeout flags, and tool-level timeouts. Avoid interactive flags such as `kubectl run -i` unless explicitly needed.
- Do not rely on `$SHELL` to detect my current interactive shell; it may report the login shell (for example zsh) even when the active shell is Fish. Prefer the parent process or another current-session signal.
- When I'm debugging why a specific command or tool fails, stay on that tool path; do not substitute an equivalent workaround command unless I ask.

## Coding best practices

- preferred languages: typescript, golang
- prioritize clean and maintainable over quick and hacky
- **important** if you install a dependency to a project, make sure you are installing the latest version, unless you specifically need an older version.
- **important** for typed languages, always prefer strong typing, never use `any` or `unknown`.
- Keep implementations simple and concrete. Do not introduce unnecessary abstractions, generic types, callback patterns, or over-engineered options objects. If a value is directly available (e.g., a timestamp on a record), use it directly rather than creating indirection layers.
- Avoid general utils files (e.g. utils.ts) - prefer specifically broken-out and named files for shared code
- In Terragrunt repositories, keep reusable Terraform modules generic. Put environment-specific and resource-instance-specific values in leaf Terragrunt configurations and pass them to modules as typed inputs.

## Corrections

### Do not delete or revert what you did not create

- Never use broad wildcard cleanup commands like `rm -rf * .*` while restructuring or repairing a repository. Move the specific checkout aside and reclone, or delete only verified paths.
- Never revert, remove, or "clean up" unrelated working-tree changes just because they appear in `git diff`/`git status`. Treat unexpected changes as user-owned unless you can prove you created them; ask before modifying them.
- Never delete newly appearing or unfamiliar files while working; I often edit or add files manually in parallel. If such a file causes a problem, inspect it and preserve it where possible, or ask before deleting/moving it.
- When I scope cleanup to a deployment/platform (for example Kubernetes), do not remove or modify similarly named resources in other platforms (Nomad, Ansible, Terraform, etc.) unless I explicitly request it.

### Verify before you assert

- Before confirming my hypothesis about where behavior lives or how code works, verify it against the repository and cite the evidence; do not blindly agree.

### Secrets

- When generating or transferring credentials and password digests, parse the tool's exact machine-readable/raw value (not decorated CLI output), use protocol-safe character sets, verify the values as consumed by the target services, and never print secret-derived values during validation.

### Keep standing reminders separate from the current task

- Do not inject a standing reminder as a new user message after the user's task. The agent can mistake the reminder for the current task. Put standing reminders in the system prompt so the user's message remains the current task.
