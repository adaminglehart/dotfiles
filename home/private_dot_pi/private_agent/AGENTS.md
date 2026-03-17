# Pi Agent Workflow

## Workflow

For any task that modifies more than 2 files or involves architectural decisions:
1. Start in plan mode (`/plannotator plans/<task-name>.md`)
2. Write the plan as markdown checklists
3. Wait for review and approval before executing
4. Track progress with `[DONE:n]` markers

For simple single-file changes, proceed directly.

## Plan storage

Plans live in the `plans/` directory in the project root, named by feature:
- `plans/auth-refactor.md`
- `plans/api-pagination.md`

Commit plans to git alongside the code.
