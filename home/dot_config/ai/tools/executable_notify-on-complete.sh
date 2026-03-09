#!/bin/bash
# Notify when Claude Code needs input, but only if not focused on Claude Code window

# Get the frontmost window title
window_title=$(osascript -e 'tell application "System Events" to get name of first window of (first process whose frontmost is true)' 2>/dev/null)

# Skip notification if focused on a Claude Code window
if [[ "$window_title" == *"Claude Code"* ]] || [[ "$window_title" == *"claude"* ]]; then
    exit 0
fi

# User is in another app/window, send notification
~/.local/bin/notify -t "Claude Code" -s "Blow" "Ready for input"
