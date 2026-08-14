# Dotfiles

Personal dotfiles managed with [`mise bootstrap`](https://mise.jdx.dev/bootstrap.html).

## Environment-Based Configuration

This repo uses mise configuration environments for `home` and `work` machines. Select an environment with `--env` or `MISE_ENV`:

```bash
mise --env home bootstrap --dry-run
mise --env work bootstrap --dry-run
```

The shared configuration is in `mise/config.toml`. Home and work additions are in `mise/config.home.toml` and `mise/config.work.toml`.

## Quick Start

```bash
# Preview all changes first
mise --env home bootstrap --dry-run

# Set up a machine after you review the preview
MISE_ENV=home just setup
```

## Structure

```
├── mise/                    # Shared and environment-specific bootstrap config
├── home/                    # Symlinked sources; mirrors paths under ~
│   ├── .config/             # → ~/.config/
│   ├── .local/              # → ~/.local/
│   └── ...
├── templates/               # Rendered environment-specific dotfiles
├── private/                 # Copy-mode private dotfiles
├── profiles/work/           # Work-only dotfile sources
└── Justfile                 # Bootstrap and focused management commands
```

## Stack

| **Category** | **Tool** |
|----------|------|
| Shell | Fish |
| Prompt | Starship |
| Editor | Zed |
| Terminal | Ghostty |
| Multiplexer | Zellij |
| Version Manager | mise |
| Secrets | 1Password (SSH signing & auth) |

## Common Commands

```bash
# Set MISE_ENV=work on a work machine. It defaults to home in Just recipes.
just status                # Inspect bootstrap state
just plan                  # Show the resource plan
just dry-run               # Preview without changing the machine
just apply                 # Apply packages, dotfiles, tools, and the final task

# Manage only dotfiles
mise --env home bootstrap dotfiles status
mise --env home bootstrap dotfiles apply --dry-run --verbose

# Inspect packages without installing them
mise --env home bootstrap packages status
mise --env work bootstrap packages status
```

## Notes

- `mise bootstrap` requires mise 2026.8.5 or newer.
- The `setup` recipe runs mise bootstrap, applies the declared macOS defaults, and sets Fish as the login shell.
- Mise does not support host-scoped defaults. The bootstrap task applies the two retained host-scoped Image Capture and battery-percentage settings.
- `mise/config.toml` replaces the old Brewfile and manages Homebrew formulae and casks through mise.
- The first package changeover on an existing machine requires a separate review: mise cannot take ownership of casks that Homebrew already owns.
- SSH authentication and commit signing use 1Password
- Pi agent configuration moved to separate repo: `~/dev/pi-config`
- See `AGENTS.md` for AI assistant guidance
