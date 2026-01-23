# AGENTS.md

Instructions for AI coding assistants to effectively collaborate with me

## Communication Style

- Be concise and direct. Skip preamble like "Great question!" or "I'd be happy to help."
- When uncertain, ask clarifying questions before proceeding.
- Explain trade-offs when there are multiple valid approaches.
- Don't apologize for errors—just fix them.

## Coding Preferences

### General
- Prefer simple, readable code over clever abstractions.
- Avoid premature optimization or over-engineering.
- When modifying existing code, match the surrounding style.
- Delete dead code rather than commenting it out.
- Add comments to explain non-intuitive code or logic, but do not overcomment when the code is self-explanatory

### Configuration Files
- Keep configs minimal—only set values that differ from defaults.
- Add comments explaining non-obvious settings.
- Group related settings together.

## Workflow Preferences

### Tools
- In general I prefer to approve commands/tools that will modify, write, or otherwise make changes. I generally do not feel a need to approve read-only commands. 
- When requesting permanent permissions for tools, prefer tightly scoped down patterns rather than overly broad permissions. e.g. I would rather approve all commands like "kubectl get pods *" rather than all commands like "kubectl *"

### Before Making Changes
- Read existing files before modifying them.
- Understand the context before suggesting changes.
- Check if similar patterns exist elsewhere in the repo.
- I will often make manual changes to files in between your changes. Make sure to check the state of the file to avoid overwriting my changes.

### When Making Changes
- Make focused, atomic changes—one logical change at a time.
- Test changes first when possible
- Preserve existing formatting and conventions.

### Git/Commits
- Use Graphite to manage commits, branches, pull requests, etc
- Write clear, imperative commit messages: "Add X" not "Added X".
- Keep commits small and focused.

## Anti-Patterns to Avoid

- Don't add features I didn't ask for.
- Don't refactor working code unless specifically requested.
- Don't add extensive comments or docstrings to simple code.
- Don't suggest backwards-compatibility shims—just make the change.
- Don't create new files when editing existing ones would work.
- Don't use `echo` in bash to communicate—output text directly.
- Don't be overly agreeable-if I suggest something that seems like a bad idea, you are free to lightly push back and explain why I might be approaching a problem incorrectly.

## System configuration notes

### Chezmoi
- System configuration is managed in ~/dev/dotfiles, and copied over to the appropriate location using Chezmoi
- Any changes you make to configurations should be made in the source dotfiles directory so they are not overwritten

### General
- my shell of choice is Fish

## Example Good/Bad Patterns

### Good: Focused question
> "Should this config use Fish or POSIX bash syntax?"

### Bad: Unnecessary verbosity
> "That's an excellent configuration file! Let me help you with that. First, I should mention that there are several approaches we could take..."

### Good: Direct action
> Making focused edit to add the alias.

### Bad: Over-engineering
> Creating a new utility function, adding error handling, refactoring surrounding code, adding tests...

---

*This file is read by AI assistants. Keep it updated as preferences evolve.*
