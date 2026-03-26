This file provides guidance to coding agents on my personal preferences for workflows and coding style.

## Repository Overview

This is a personal dotfiles repository managed by **chezmoi**. The source directory is `home/` which maps to `~/.config` via chezmoi's naming convention (e.g., `dot_config` → `.config`).

## Common Commands

### Chezmoi Operations
```bash
chezmoi apply              # Apply changes from source to home directory
chezmoi diff               # Preview changes before applying
chezmoi edit <file>        # Edit a managed file
chezmoi add <file>         # Add a new file to source state
```

### Package Management
```bash
brew bundle --file=brewfiles/Brewfile.home   # Install home packages
brew bundle --file=brewfiles/Brewfile.core   # Install core packages only
```

### Just Commands (from ~/.config/just/)
```bash
just                       # List available submodules
just onepassword::get <name>    # Retrieve credential from 1Password
just onepassword::set <name> <value>  # Store credential in 1Password
```

### Initial Setup
```bash
./install                  # Bootstrap Homebrew
./initial.sh              # Full Mac setup (Homebrew, Fisher, shell, .macos)
```

## Git Workflow

This repo uses **Graphite** for PR stack management instead of direct git commands:

```bash
gt create -m "<message>"   # Create feature branch with commit
gt submit                  # Submit branch and create PR
gt modify && gt submit --stack --update-only  # Update existing branch
gt sync                    # Sync latest from remote
gt co <branch>            # Checkout branch
```

## Architecture

### Directory Structure
- `home/` - Chezmoi source directory (maps to `~`)
  - `dot_config/` - Application configs (→ `~/.config/`)
- `brewfiles/` - Homebrew bundle files
  - `Brewfile.core` - Language-agnostic core tools
  - `Brewfile.home` - Personal/home-specific packages
  - `Brewfile.stripe` - Work-specific packages
- `.macos` - macOS system preferences script

### Key Configurations
- **Shell**: Fish with extensive aliases (gs=git status, g=git, kub=kubectl, tf=terraform)
- **Prompt**: Starship with two profiles (full and simple via `SIMPLE_MODE` env var)
- **Editors**: Neovim (kickstart.nvim-based), Zed (Claude AI integrated)
- **Terminal**: Ghostty with Zellij multiplexer
- **Version Management**: mise for tool versions (age, fnox)
- **VCS**: Jujutsu (jj) configured alongside git, both with 1Password SSH signing

### 1Password Integration
SSH authentication and signing keys are managed via 1Password:
- SSH socket: `~/Library/Group Containers/2BUA8C4S2C.com.1password/t/agent.sock`
- Age encryption keys retrieved via `op inject`

### Chezmoi Naming Convention

Chezmoi uses filename prefixes to encode special behaviors. The source directory is `home/`, which maps to `~`.

**Prefix Rules:**
- `dot_` → converted to `.` (hidden files/dirs)
  - `dot_config` → `.config/`
  - `dot_bashrc` → `.bashrc`
- `private_` → sets file mode 0600 (user read/write only)
  - `private_dot_ssh` → `.ssh/` (mode 0700)
  - `private_dot_pi/private_agent/auth.json` → `~/.pi/agent/auth.json` (mode 0600)
- `symlink_` → creates symlink instead of copying
  - `symlink_config_nvim_init.lua` → `~/.config/nvim/init.lua` (symlink)

**Directory Nesting:**
- Underscores separate path components
- `dot_config_fish_user_conf_d` → `~/.config/fish/user_conf.d/`
- `private_dot_pi_private_agent_extensions` → `~/.pi/agent/extensions/`

**Special Files:**
- `.chezmoiroot` in `home/` marks it as the source root (points to `~`)
- `.chezmoiignore` excludes files from applying
- `.chezmoitemplates/` holds Handlebars templates for config generation

### File Structure Examples

| Source Path | Installed Path | Notes |
|---|---|---|
| `home/AGENTS.md` | `~/AGENTS.md` | Regular file |
| `home/dot_config/nvim/init.lua` | `~/.config/nvim/init.lua` | Hidden directory |
| `home/private_dot_ssh/config` | `~/.ssh/config` | Mode 0600, hidden |
| `home/private_dot_pi/private_agent/auth.json` | `~/.pi/agent/auth.json` | Deeply nested, restricted |
| `home/dot_config/fish/user_conf_d/alias.fish` | `~/.config/fish/user_conf.d/alias.fish` | Nested config |
| `home/symlink_config_nvim_init_lua` | `~/.config/nvim/init.lua` (symlink) | Points back to source |

### Common Patterns

**When to use each prefix:**

- **No prefix** — Regular config files to copy as-is
- **`dot_`** — Any file/directory that should be hidden (start with `.`)
- **`private_`** — Secrets, keys, auth tokens that should be read-only by user
- **`symlink_`** — Config files you want to edit in dotfiles and keep in sync (e.g., Neovim init.lua)

**Real examples from this repo:**
```
home/AGENTS.md                                    → ~/AGENTS.md
home/dot_config/fish/...                          → ~/.config/fish/...
home/private_dot_pi/private_agent/AGENTS.md       → ~/.pi/agent/AGENTS.md
home/private_dot_pi/private_agent/extensions/     → ~/.pi/agent/extensions/
home/dot_config/opencode/symlink_AGENTS.md        → ~/.config/opencode/AGENTS.md (symlink)
```

### How to Verify What's Managed

Check if a file is Chezmoi-managed:
```bash
cd ~/dev/dotfiles
git ls-files | grep <filename>          # See if it's in source tree
chezmoi status                            # Show all managed files with changes
chezmoi diff                              # Preview what would change on apply
```

Check what a source path maps to:
```bash
chezmoi execute-template --init=false '{{ .chezmoi.homeDir }}' # Confirm home dir
ls -la ~/.pi/agent/AGENTS.md            # Check installed file
cat ~/dev/dotfiles/home/private_dot_pi/private_agent/AGENTS.md  # Check source
```

### Editing Chezmoi-Managed Files

**DO:** Edit source files in `~/dev/dotfiles/home/`
```bash
# Edit the source
vim ~/dev/dotfiles/home/AGENTS.md
# Then sync to home directory
chezmoi apply ~/AGENTS.md
```

**DON'T:** Edit the installed copy directly
```bash
# This will be lost on next chezmoi apply
vim ~/AGENTS.md  # ❌ Edit in dotfiles instead!
```

- if you rename a file that's managed by chezmoi, you must delete the old file with the old name to avoid a dangling duplicate

### Adding New Files to Chezmoi

```bash
# Option 1: Add existing file from home directory
chezmoi add ~/.config/myapp/config.yaml

# Option 2: Create in source directly
vim ~/dev/dotfiles/home/dot_config/myapp/config.yaml
chezmoi apply ~/.config/myapp/config.yaml
```

## Pi Configuration

**Location:** `home/private_dot_pi/private_agent/` (maps to `~/.pi/agent/` via Chezmoi)

### Directory Structure

Pi configuration is managed in this dotfiles repo at:
```
home/private_dot_pi/private_agent/
  ├── AGENTS.md                    # Workflow rules (plan mode, extensions, context mgmt)
  ├── settings.json                # Runtime settings (model, theme, API endpoints)
  ├── models.json                  # Provider & model registration
  ├── auth.json                    # Authentication tokens (private, mode 0600)
  ├── extensions/                  # Custom TypeScript/JavaScript extensions
  ├── skills/                      # Reusable task-specific instruction packages
  └── sessions/                    # Conversation history & branching (auto-generated)
```

### Key Paths

- **Config root:** `~/.pi/agent/` (managed by Chezmoi, synced from `home/private_dot_pi/private_agent/`)
- **Extensions:** `~/.pi/agent/extensions/` — TypeScript/JavaScript loaded at startup
- **Skills:** `~/.pi/agent/skills/` — Self-contained task instruction packages with tools
- **Sessions:** `~/.pi/agent/sessions/` — Conversation history, branching, compaction data
- **Status:** `~/.pi/agent/status/` — Session metadata and context markers
- **Dotfiles source:** Always edit in `~/dev/dotfiles/home/private_dot_pi/private_agent/`

### Configuration Files

- **settings.json** — Pi runtime settings
  - Current model selection
  - Theme configuration
  - API endpoints and provider defaults
  - Prompt templates
  
- **models.json** — Provider and model registration
  - Lists available models per provider
  - Tool capability mappings
  
- **auth.json** — Authentication credentials (⚠️ restricted mode 0600)
  - API keys for multiple providers
  - Subscription tokens

### Context Management

Use the `context-pilot` skill proactively to prevent session drift:

**Tag at decision boundaries:**
- Before explaining constraints or architecture
- Before structural changes (directory moves, refactors)
- Before implementing after planning
- When switching approaches

**Squash noisy history:**
- After backtracking or failed attempts
- After research/data gathering (process is noise, results matter)
- When context window fills with debugging

**Pattern:** `context_tag({ name: "<task>-<phase>" })` → work → `context_checkout({ target: "<task>-<phase>", message: "..." })`

### Best Practices

#### Creating/Editing Extensions & Skills

1. **Always edit in dotfiles source first:**
   ```bash
   # Source location
   ~/dev/dotfiles/home/private_dot_pi/private_agent/extensions/my-tool.ts
   
   # Then sync to installed location
   chezmoi apply ~/.pi/agent/extensions/my-tool.ts
   ```

2. **Use TypeScript** for extensions
   - Leverage Pi's SDK types for type safety
   - Export default function that receives Pi's extension context
   - Register custom tools, commands, or TUI components
   - See examples: `/path/to/pi/docs/examples/extensions/`
   - always put extensions inside their own directory, rather than just a single named file

3. **Skills as task packages**
   - Include `SKILL.md` describing purpose and usage
   - Can be standalone or integrate with existing tools
   - Reference Pi tools by name (`read`, `write`, `edit`, `bash`, etc.)

- **Context Management** — Always use context-pilot skill; read at task start and tag at decision boundaries

### Skills

- most skills are managed in ~/.agents/skills (dotfiles/dot_agents/skills)
- skills that only apply to the pi agent (e.g. skills with scripts that interact with the pi sdk, pi sessions, etc) are managed under dotfiles/private_dot_pi/dot_agent/skills

### Tool Capabilities

#### Built-in Tools
- `read` — Read files and images
- `write` — Create or overwrite files
- `edit` — Surgical edits (old text must match exactly)
- `bash` — Execute shell commands

### Debugging Pi Configuration

**Check current settings:**
```bash
cat ~/.pi/agent/settings.json
```

**View session history structure:**
Use `context_log` to visualize the conversation DAG and identify divergence points.

**Inspect extension errors:**
- Extensions compile at Pi startup; check console for TypeScript errors
- Verify exports match Pi's extension context schema
- Test incrementally before deploying

**Verify files are synced:**
```bash
cd ~/dev/dotfiles
git ls-files | grep private_dot_pi/private_agent  # See what's tracked
chezmoi status                                      # Show all changes
chezmoi diff ~/.pi/agent/AGENTS.md                 # Preview specific file
```

### Related Documents

- **Pi docs:** See `home/private_dot_pi/private_agent/AGENTS.md` (workflow rules)
- **Home agent guidelines:** See `home/AGENTS.md` (general coding principles)
- **Pi upstream:** `/Users/adaminglehart/.local/share/mise/installs/node/25.8.1/lib/node_modules/@mariozechner/pi-coding-agent/docs/`
