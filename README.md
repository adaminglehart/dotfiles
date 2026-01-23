# Dotfiles

Personal dotfiles managed with [chezmoi](https://www.chezmoi.io/).

## Environment-Based Configuration

This repo uses chezmoi's templating to manage different configurations for `home` vs `work` environments. Templates (`.tmpl` files) conditionally include settings based on the `.environment` variable:

```
{{- if eq .environment "home" }}
# Home-specific config
{{- else }}
# Work-specific config
{{- end }}
```

The environment is set in `~/.config/chezmoi/chezmoi.yaml` or prompted during `chezmoi init`.

## Quick Start

```bash
# Install chezmoi and apply dotfiles
sh -c "$(curl -fsLS get.chezmoi.io)" -- init --apply $GITHUB_USERNAME

# Or if chezmoi is already installed
chezmoi init --apply $GITHUB_USERNAME
```

### Fresh Mac Setup

```bash
./install   # Bootstrap Homebrew, Fisher, shell, and macOS preferences
```

## Structure

```
├── home/                    # Chezmoi source (maps to ~)
│   ├── dot_config/          # → ~/.config/
│   │   ├── fish/            # Shell config
│   │   ├── zed/             # Zed editor
│   │   ├── ghostty/         # Terminal
│   │   ├── zellij/          # Multiplexer
│   │   ├── starship.toml    # Prompt
│   │   └── ...
│   ├── dot_claude/          # Claude Code settings
│   └── dot_Brewfile.tmpl    # Templated Brewfile (→ ~/.Brewfile)
└── .macos                   # macOS system preferences
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
# Chezmoi
chezmoi apply              # Apply changes to home directory
chezmoi diff               # Preview pending changes
chezmoi add <file>         # Track a new file
chezmoi manage <file>      # Add an existing file to chezmoi-managed files

# Packages (uses templated ~/.Brewfile)
brew bundle --global       # Install from ~/.Brewfile
```

## Notes

- SSH authentication and commit signing use 1Password
- See `AGENTS.md` for AI assistant guidance
