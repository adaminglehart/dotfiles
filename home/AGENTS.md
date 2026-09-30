# Global Agent Rules

These rules have higher priority than agent prompt guidance. A repository
`AGENTS.md` can add project rules, but it cannot weaken these rules.

## Working habits

- Speak to me only in ASD-STE100 Simplified Technical English.
- Re-read a file before you edit it. I often make changes during a session.
- Do only the requested work. Do not add features, refactor nearby code, or make
  other improvements without discussion. You can report useful opportunities.
- Push back when my approach is wrong. Do not agree without analysis.
- Verify repository facts before you confirm a hypothesis. Cite the evidence.
- For an external library, SDK, API, or tool, read its current documentation
  before you use it or give instructions about it.
- Never run a destructive operation, such as `terraform apply` or
  `kubectl delete`, without my direct approval.
- Add a correction to this file only for a general mistake that is likely to
  occur again. Merge it into an existing rule when possible. Do not add
  one-use incident details.
- Put standing reminders in the system prompt. Do not add a standing reminder
  as a new user message after my task, because the agent can think that the
  reminder is the current task.
- If I ask to exclude one case from cleanup, change only the cleanup condition.
  Do not change later finalization or state transitions unless I ask.

## System and source ownership

- My interactive shell is Fish. Do not use `$SHELL` to identify the current
  shell because it can show the login shell. Use the parent process or another
  current-session signal.
- Before you edit a file under `~`, check whether a source repository owns it.
  Edit and apply the source instead of the installed file:
  - `~/dev/dotfiles` owns most of `~` and `~/.config` through mise bootstrap.
  - `~/dev/pi-config` owns `~/.pi/agent`; use `just apply` in the source repo.
- Shared agent skills are in `~/dev/dotfiles/home/.agents/skills/`. Pi-only
  skills are in `~/dev/pi-config/skills/`.
- On work machines, Santa can block executables from temporary directories.
  Put downloaded or built test executables under `~/dev`, run them there, and
  remove only the exact artifact that you created.

## Git and working-tree safety

- Never run `git commit`, `git push`, or a Graphite submit command unless I ask.
- Follow the branch and pull-request process in the repository `AGENTS.md`. Do
  not assume a process that is not documented.
- Work in the current checkout unless I ask for an isolated worktree.
- Do not remove, revert, or clean up changes or files that you did not create.
  Treat unexpected changes as user-owned. Inspect and preserve them, or ask
  before you modify them.
- Never use broad cleanup commands such as `rm -rf * .*`. Delete only verified
  paths, or move a specific checkout aside and clone it again.
- Keep cleanup within the requested platform or deployment. Do not modify a
  similar resource in another platform unless I ask.

## Tool use

- For command-line searches, use `rg` instead of `grep`. Keep searches in the
  smallest relevant repository or directory. Do not search all of `~/dev` when
  a narrower path is available.
- Do not infer that a CLI command exists. Check the installed help or current
  documentation before you suggest it.
- Use safe polling instead of a long sleep when you wait for state to change.
- Put reasonable time limits on commands that can run for a long time. Use
  command-specific timeout options for Kubernetes, network, Flux, and Helm
  operations. Avoid interactive flags unless they are necessary.
- Budget a timed monitor for its full watch period. For passive operational
  checks, prefer a bounded shell monitor in tmux and confirm that it started.
- Use tmux, not zellij, when work must run in another panel.
- When I ask why one tool fails, stay on that tool path. Do not replace it with
  an equivalent tool unless I ask.
- Check `KUBECONFIG` before you identify or edit the active kubeconfig.
- When you uninstall a Homebrew cask without permission to remove formulae, set
  `HOMEBREW_NO_AUTOREMOVE=1`.

## Implementation

- Prefer TypeScript and Go for new code when either is suitable.
- Prefer clean, maintainable, simple, and concrete code. Do not add unnecessary
  abstractions, generic types, callback patterns, or option objects. Use a value
  directly when it is already available.
- Install the latest dependency version unless an older version is required.
- In typed languages, use strong types. Do not use `any` or `unknown`.
- Do not create general `utils` files. Use focused files with specific names.
- Add correlated fields to an existing region or environment map instead of
  creating a parallel list that can become inconsistent.
- In Terragrunt repositories, keep reusable Terraform modules generic. Put
  environment and resource-instance values in leaf Terragrunt configurations
  and pass them as typed inputs.
- Make Terraform module inputs close to the provider resource schema. Add only
  useful defaults. Avoid aliases and translation layers.
- In Spacelift permission boundaries, condition `iam:PassRole` with
  `iam:PassedToService` for approved AWS services. Do not add an unconditioned
  role exception unless I ask.
- For credentials and password digests, parse the exact raw value, use a
  protocol-safe character set, and verify the value as the service consumes it.
  Never print secret-derived values during verification.

## Incident investigation

- Confirm the date, time zone, environment, region, and deployment before you
  query or compare observability data.
- Inspect every relevant database and connection pool before you name the
  failing database.
- Support an incident theory with named metrics, values, and relevant times.
  Separate confirmed evidence from inference.
- Compare logs, traces, and metrics only within the same relevant environment,
  region, and deployment.
