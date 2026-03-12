---
name: modified-files
description: Opens a zellij pane that shows a live-updating, deduped list of files modified during this session, sorted by most recently modified.
---

# Modified Files Tracker

Opens a zellij pane that continuously watches for file changes and displays a deduped list of modified files, sorted by most recently modified (newest first).

## Usage

Run the watcher script in a new zellij pane:

```bash
zellij_run with direction "down" and name "Modified Files":
  bash ./watch-modified.sh <project-directory>
```

The script path is relative to this skill directory: `.pi/skills/modified-files/watch-modified.sh`

Use the project's working directory as the argument. The watcher will:
- Track all files modified after it starts
- Deduplicate paths
- Sort by most recently modified (newest first)
- Refresh every 2 seconds
- Exclude `.git/`, `node_modules/`, and `.pi/sessions/`
