---
name: self-improve
description: Reviews session results and proposes concrete changes to agent instructions, tests, documentation, scripts, and code. Use when asked to "self-improve", "reflect on session", "what can we improve", "session retrospective", or "end of session review". Gets approval before making changes.
---

# Self-Improve

Review the current session. Propose changes supported by evidence. Make only
approved changes.

## Step 1: Collect Evidence

Use the conversation, tool results, errors, test results, and user corrections.
Read a session file only when the required evidence is not in the conversation.
Do not start subagents unless the user has approved delegation.

Check these areas:

- Agent instructions and skill descriptions that caused a repeated mistake.
- Tests that did not detect a confirmed defect.
- Documentation or scripts that gave incorrect results.
- Task instructions that caused work outside the approved scope.
- Tools or extensions that were missing, duplicated, or loaded by mistake.

Skip areas with no concrete finding. Do not propose changes only to fill a list.

## Step 2: Find the Source Owner

Read the applicable `AGENTS.md` files and current source before proposing edits.

| Area | Source |
|------|--------|
| Shared skills and home configuration | `~/dev/dotfiles` |
| Primary Pi instructions, agents, extensions, and Pi-only skills | `~/dev/pi-config` |
| Project code, tests, and documentation | The current project repository |

Verify the source mapping. Do not edit a deployed file when a repository owns
it. Do not put a one-time session detail into standing agent instructions.

## Step 3: Request Approval

Present only actionable findings:

| # | Area | Evidence | Proposed Change | Source Files |
|---|------|----------|-----------------|--------------|
| 1 | Tests | A test did not detect the confirmed defect | Add a regression test | The affected test file |

Ask which items to change. Wait for approval before creating tasks or editing
files. If the current request already approves specific changes, keep that
approval and do not ask again.

## Step 4: Make and Verify Approved Changes

- If the `todo` tool is available, create and claim a task for each approved item.
- Re-read each source file before editing it. Preserve unrelated user changes.
- Make the smallest change that addresses the evidence.
- Run the relevant tests or validation commands. Follow the source repository's
  build and deployment rules. Do not deploy outside the approved scope.
- Close each task only after its required checks pass.
- Do not commit or push unless the user explicitly requests it.

Report each completed item, its source files, and its verification result.
Report failures and remaining work separately. Do not claim success without
command output that supports it.
