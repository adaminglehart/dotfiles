# AGENTS.md
# CLAUDE.md

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
- `dot_` prefix → dot files (e.g., `dot_config` → `.config`)
- `private_` prefix → files with restricted permissions
- `.chezmoiroot` indicates `home/` as the source root
