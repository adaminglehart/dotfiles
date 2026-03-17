#!/usr/bin/env bash
set -euo pipefail

image_tag="${1:-pi-sandbox:latest}"
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"

agent_dir=""
if [[ -d "${script_dir}/../agent" ]]; then
  agent_dir="${script_dir}/../agent"
elif [[ -d "${script_dir}/../private_agent" ]]; then
  agent_dir="${script_dir}/../private_agent"
else
  printf 'Could not locate the Pi agent directory next to %s\n' "$script_dir" >&2
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
