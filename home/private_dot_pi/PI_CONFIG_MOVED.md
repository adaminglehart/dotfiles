# Pi Configuration Moved

Pi agent configuration has been moved to a separate repository for better management.

## New Location

**Repository:** `~/dev/pi-config`

**Installed to:** `~/.pi/agent/`

## Why Separate?

- **Cleaner separation** - Pi config is logically distinct from general dotfiles
- **Environment management** - Easier to manage work vs. home LLM providers
- **Still uses Chezmoi** - Maintains templating and environment detection
- **Independent versioning** - Changes to Pi config don't clutter dotfiles history

## How to Use

```bash
# Clone the Pi config repo (if not already present)
git clone <pi-config-repo-url> ~/dev/pi-config

# Apply configuration
cd ~/dev/pi-config
chezmoi init --source ~/dev/pi-config
chezmoi apply --source ~/dev/pi-config

# Or use the helper script
~/dev/pi-config/apply.sh
```

## Editing Pi Config

**Always edit in the new location:**
```bash
# Edit agent definitions, extensions, skills
vim ~/dev/pi-config/agents/worker.md
vim ~/dev/pi-config/extensions/custom-footer/index.ts

# Edit environment-specific settings
vim ~/dev/pi-config/.chezmoitemplates/pi/settings.work.json
vim ~/dev/pi-config/.chezmoitemplates/pi/models.home.json

# Apply changes
cd ~/dev/pi-config && chezmoi apply --source ~/dev/pi-config
```

## Sandbox Build Script

The sandbox build script has been updated to use the new location at `~/dev/pi-config`.

See: `~/.pi/sandbox/build.sh`

## Migration Date

2026-03-27
