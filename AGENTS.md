This file provides guidance to coding agents on my personal preferences for workflows and coding style.

## Repository Overview

This is a personal dotfiles repository managed by **mise bootstrap**. Shared configuration is in `mise/config.toml`; `mise/config.home.toml` and `mise/config.work.toml` add environment-specific state.

## Common Commands

### Mise Bootstrap Operations
```bash
mise --env home bootstrap status
mise --env home bootstrap plan
mise --env home bootstrap --dry-run
mise --env home bootstrap dotfiles apply --dry-run --verbose
```

### Package Management
```bash
mise --env home bootstrap packages status
mise --env work bootstrap packages status
```

### Just Commands (from ~/.config/just/)
```bash
just                       # List available submodules
just onepassword::get <name>    # Retrieve credential from 1Password
just onepassword::set <name> <value>  # Store credential in 1Password
```

## Git Workflow

This repo uses **Graphite** for PR stack management instead of direct git commands.
When asked to reconcile local changes with `main` and push them in this repo, push the reconciled commit directly to `main`; do not create a PR unless explicitly requested.

```bash
gt create -m "<message>"   # Create feature branch with commit
gt submit                  # Submit branch and create PR
gt modify && gt submit --stack --update-only  # Update existing branch
gt sync                    # Sync latest from remote
gt co <branch>            # Checkout branch
```

## Architecture

### Directory Structure
- `mise/config.toml` - Shared packages, tools, bootstrap task, and dotfile mappings
- `mise/config.home.toml` - Home-only packages and tools
- `mise/config.work.toml` - Work-only packages and dotfiles
- `home/` - Symlinked dotfile sources that mirror paths under `~`
- `templates/` - Rendered environment-specific dotfiles
- `private/` - Copy-mode private dotfiles
- `profiles/work/` - Work-only dotfile sources
- macOS preferences are declared under `[bootstrap.macos.*]` in `mise/config.toml`.

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

### Dotfile Management

The `home/` tree mirrors `$HOME` and uses a small set of top-level `symlink-each` entries. Keep templates, private copies, and profile-specific sources in their dedicated top-level directories.

Use `symlink-each` for shared directories, `template` for Tera templates, and `copy` for private files that must not be symlinks. The `bootstrap` task sets private target modes to `0600`.
Mise manages formulae and casks through `[bootstrap.packages]`. Do not add a Brewfile. Home-only packages belong in `mise/config.home.toml`, and work-only packages belong in `mise/config.work.toml`.

Before a change, inspect `mise/config.toml` to find the source mapping. Edit the source in this repository, not the installed file under `~`.

Do not apply changes unless the user asks. Verify configuration changes with:

```bash
mise --env home bootstrap status
mise --env home bootstrap plan
mise --env home bootstrap --dry-run
mise --env home bootstrap dotfiles apply --dry-run --verbose
```

For a normal file under a mapped directory, add the same home-relative path under `home/`; no new mapping is needed. Add one mapping for a new top-level home file. Use `templates/`, `private/`, or `profiles/work/` only for their specific modes.

## Pi Configuration

**Pi agent configuration lives in a separate repository.**

**Location:** `~/dev/pi-config` (separate repo, all pi agent configuration should be done there)
