#!/bin/sh
set -eu

if ! command -v herdr >/dev/null 2>&1; then
    exit 0
fi

for plugin in global-space-layout projects; do
    herdr plugin link "$HOME/.config/herdr/plugins/$plugin" >/dev/null
done
