# Dotfiles

Personal dotfiles managed with [chezmoi](https://www.chezmoi.io/).

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
│   │   ├── nvim/            # Neovim (kickstart-based)
│   │   ├── ghostty/         # Terminal
│   │   ├── zellij/          # Multiplexer
│   │   ├── starship.toml    # Prompt
│   │   └── ...
│   ├── dot_claude/          # Claude Code settings
│   └── dot_Brewfile.tmpl    # Templated Brewfile (→ ~/.Brewfile)
└── .macos                   # macOS system preferences
```

## Stack

| Category | Tool |
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

# Packages (uses templated ~/.Brewfile)
brew bundle --global       # Install from ~/.Brewfile
```

## Brewfile Templating

The main Brewfile (`dot_Brewfile.tmpl`) uses chezmoi templating to include environment-specific packages based on the `.environment` variable set during `chezmoi init`:

```
{{- if eq .environment "home" }}
# Home-specific packages
{{- else }}
# Work-specific packages
{{- end }}
```

Set your environment in `~/.config/chezmoi/chezmoi.yaml` or during init.

## Notes

- SSH authentication and commit signing use 1Password
- Starship has two modes: full (default) and simple (`SIMPLE_MODE=1`)
- See `AGENTS.md` for AI assistant guidance
