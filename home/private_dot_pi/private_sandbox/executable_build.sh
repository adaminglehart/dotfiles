#!/usr/bin/env bash
set -euo pipefail

image_tag="${1:-pi-sandbox:latest}"
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"

# Pi agent config moved to ~/dev/pi-config
agent_dir="${HOME}/dev/pi-config"
if [[ ! -d "$agent_dir" ]]; then
  printf 'Pi agent config not found at %s\n' "$agent_dir" >&2
  printf 'Expected location: ~/dev/pi-config (managed separately from dotfiles)\n' >&2
  exit 1
fi

stage_dir="$(mktemp -d)"
cleanup() {
  rm -rf "$stage_dir"
}
trap cleanup EXIT

mkdir -p "$stage_dir/.pi/agent"
cp "$script_dir/Dockerfile" "$stage_dir/Dockerfile"
cp -R "$agent_dir/extensions" "$stage_dir/.pi/agent/"
cp -R "$agent_dir/skills" "$stage_dir/.pi/agent/"
cp "$agent_dir/settings.json" "$stage_dir/.pi/agent/settings.json"
cp "$agent_dir/models.json" "$stage_dir/.pi/agent/models.json"
cp "$agent_dir/AGENTS.md" "$stage_dir/.pi/agent/AGENTS.md"

docker build -t "$image_tag" -f "$stage_dir/Dockerfile" "$stage_dir"
