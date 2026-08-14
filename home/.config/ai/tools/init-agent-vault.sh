#!/bin/bash
# Initialize the Obsidian agents vault directories and QMD collections.
# Idempotent — safe to run multiple times.

set -euo pipefail

VAULT_BASE="$HOME/Documents/obsidian/agents"

# Create vault directories
for dir in sessions memories projects scratch; do
  mkdir -p "$VAULT_BASE/$dir"
done

echo "Vault directories created at $VAULT_BASE"

# Add QMD collections (skip if already exist)
existing=$(qmd collection list 2>/dev/null || true)

for collection in sessions memories projects scratch; do
  if echo "$existing" | grep -q "^$collection "; then
    echo "QMD collection '$collection' already exists, skipping"
  else
    qmd collection add "$VAULT_BASE/$collection" --name "$collection" --mask "*.md"
    echo "Added QMD collection '$collection'"
  fi
done

# Initial index
qmd update
echo "QMD index updated"
