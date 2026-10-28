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

- Never run `git commit`, `git push`, or a Graphite submit command unless I ask
  or the repository `AGENTS.md` gives a commit and push policy.
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

## Corrections

Domain-specific corrections belong in the repository `AGENTS.md` or skill that
owns the domain. For example, Kubernetes, Talos, Proxmox, Ansible, GB10, and
network corrections are in `~/dev/homelab/AGENTS.md`.

### Continue approved work

- When I approve a multi-step task, do each next step that is inside the
  approval. Do not stop after a status summary that ends with "Next: …". Stop
  only for a real blocker, a decision that needs me, or a separate approval
  gate, such as a destructive operation or a live external change.
- When I approve implementation, checks, review, a commit, and then the next
  phase, continue without asking again at each phase boundary. A commit
  instruction does not by itself authorize a push unless the repository
  `AGENTS.md` says so.

### Keep side tasks smaller than the main task

- Give minor tooling and reporting work a narrow scope. When the required
  behavior and safety checks pass, finish the side task and return to the main
  work.
- If I say a side task does not need more tests or review, stop that work. Do
  not replace it with a smaller review or keep it as a gate for the main task.

### Plans

- When I ask to plan in stages, keep the first plan at the requested level. Do
  not add file layouts, task lists, or detailed test plans until I approve the
  high-level plan and ask for the execution plan.

### Verify before you assert

- Before you confirm a hypothesis about where behavior lives or how code works,
  verify it against the repository and cite the evidence.
- When a service has configuration for multiple environments, verify the
  endpoint and target environment before editing.
- Before you give a command for a live hardware value, verify that it reports
  the active output and not a stored setting.
- Before you recommend values for a configuration table, inspect all validation
  rules, including ordering, uniqueness, continuity, and range rules.
- Before you tell me where to change a parameter in a visual workflow, check
  whether it is hidden inside a subgraph.
- When a tool update adds built-in support for an installed adapter's function,
  read the current documentation before you recommend keeping the adapter.
- When a custom tool needs a new operation, inspect the built-in manager's
  extension points before you write a replacement manager.
- A display name or CLI setting can differ from the value sent to a service.
  For service-tier or speed-mode fields, check the active client source and
  model metadata, and keep request-format tests separate from service
  acceptance.

### Keep inspection read-only

- Do not use commands with write flags such as `--in-place`, `--set`, or
  `config` subcommands when you only need to inspect state. Separate all
  mutations into an explicit approved step.
- An import can run a script's top-level code. To check syntax, use a
  syntax-only command, such as `node --check` or `bash -n`. A restriction on
  running a hook also applies to its check script.

### Secrets

- Before you run a status or config command, check whether it resolves
  environment-variable references or secret placeholders. Filter secret fields
  inside the target process before output reaches the transcript.
- Do not print a raw diff of a private configuration file. Compare keys or
  structure only, or redact secret values first.
- A 1Password CLI "account is not signed in" error does not prove that the
  desktop app is signed out. Check the CLI app integration and the documented
  CLI sign-in flow first. Inspect item field names without values.
- If automatic project secret loading causes repeated authentication, keep the
  shell integration. Fix or refresh the local encrypted secret cache.

### Commands and output

- Commands sent through a Bash tool must use Bash syntax, even though my
  interactive shell is Fish.
- Read each tool's timeout unit. The Bash tool uses seconds; subagent fields
  ending in `Ms` use milliseconds.
- Do not pipe test, build, or vet output into `head` or `tail`. Save the
  complete output and keep the exit status. Use `tee` with `set -o pipefail`.
- A test timeout does not bound compilation. Keep an outer command limit and
  keep partial output if it expires.
- Use `jq` for JSON and `yq` for YAML. When Python needs a package, use
  `uv run --with <package> python -`. System `python3` does not have PyYAML. Do
  not call the Python inside another tool's installation, such as Ansible's.
- For a GitHub file, find the exact path with `gh api repos/<owner>/<repo>/contents/<dir>`
  before you fetch it. Do not guess `raw.githubusercontent.com` paths.

### Test fixtures

- Create test fixtures in a new directory from `mktemp`. Do not delete a fixed
  path to prepare a test.
- Stop immediately if fixture creation, a required tool, or `cd` fails. Use
  `git -C "$fixture"` for fixture mutations, clear inherited Git directory
  overrides, and verify that the target is the fixture.
- Do not rely only on `set -e` inside functions or command substitutions.

### Git

- Run dependent Git mutations, such as stash, switch, merge, and stash restore,
  in sequence. Do not run read-only Git checks in parallel with Git mutations in
  the same working tree.
- A no-staging instruction means do not change the index. Never use
  `git reset` or unstage files to make the index empty. Preserve staged files
  and report them.

### Edits

- `@INS.BEFORE` and `@INS.AFTER` keep the anchor rows. Do not repeat the anchor
  in the inserted rows.
- When one config change replaces a line and inserts an adjacent setting,
  validate the result before the write. Assert that each required key exists
  exactly once.

### Subagents and monitors

- Build long workflow prompts as escaped strings or arrays joined with `\n`.
  Validate a generated workflow with `subagent` `action: "validate"` before
  launch, and launch the same file.
- Do not delegate a timed monitor with a tool or turn budget that can expire
  before the watch period ends.

### Runtimes

- For a new project, select the latest stable runtime release. Record a
  dependency's minimum version only as compatibility information.
