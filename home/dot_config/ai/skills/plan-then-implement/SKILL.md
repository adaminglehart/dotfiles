---
name: plan
description: Structured plan-then-implement workflow for complex tasks. Use when the user wants to plan before coding, when tackling multi-step implementations, or when the user says 'let's plan' or 'implement the following plan'. Produces phased implementation plans with verification steps, then executes them incrementally.
---

# /plan — Plan then implement

Create a structured implementation plan, get approval, then execute phase by phase.

## Usage

- `/plan` — Start planning mode interactively
- `/plan <topic>` — Start planning mode with a specific goal
- `/plan --resume` — Resume an interrupted plan from the last completed phase

If the user says "implement the following plan:" with a pasted plan, skip planning and go straight to execution.

## Instructions

### Phase 1: Planning

1. Gather requirements through targeted questions (max 3 at a time). Stop asking once the goal is clear.
2. Research the codebase as needed. For large codebases, spawn subagents to explore in parallel.
3. Produce a structured plan:

```
## Goal
<1-2 sentence summary>

## Phases

### Phase 1: <title>
- **Deliverable**: <what is produced>
- **Files**: <specific files to create/modify>
- **Dependencies**: <prior phases required, or "none">
- **Verify**: <concrete check — a command to run, a test to pass, a behavior to observe>

### Phase 2: <title>
...

## Risks
- <Known unknowns or potential blockers>
```

4. Present the plan and wait for explicit approval before proceeding.

### Phase 2: Execution

After approval, execute phase by phase:

1. Announce the current phase: `## Executing Phase N: <title>`
2. Do the work.
3. Run the verification step.
4. Report results. If verification passes, move to the next phase. If it fails, stop and discuss before continuing.

Between phases, briefly restate what was completed and what's next.

### Resuming (`/plan --resume`)

1. Look for a plan in the current session context.
2. Identify the last completed phase by checking which deliverables exist and which verifications pass.
3. Continue from the next incomplete phase.

## Principles

- Be concrete — use file paths, function names, specific changes. Vague plans are useless.
- Each phase must be independently verifiable.
- Prefer 3-5 phases. If you have 10+, consolidate.
- Later phases can be rough — refine them as earlier phases complete.
- Don't gold-plate the plan. A plan that takes 20 minutes to read defeats the purpose.
