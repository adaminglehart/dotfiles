#!/usr/bin/env bash
# Watches for modified files relative to a start time, displays a
# deduped list sorted by most recently modified (newest first).
# Usage: watch-modified.sh [directory]

set -euo pipefail

DIR="${1:-.}"
# Marker: files modified after this script starts
START_TIME=$(date +%s)
TMPFILE=$(mktemp)
trap 'rm -f "$TMPFILE"' EXIT

# Touch a reference file with our start time
REF=$(mktemp)
touch -t "$(date -r "$START_TIME" +%Y%m%d%H%M.%S)" "$REF"
trap 'rm -f "$TMPFILE" "$REF"' EXIT

while true; do
  # Find files modified since we started, excluding common noise
  find "$DIR" -type f -newer "$REF" \
    -not -path '*/.git/*' \
    -not -path '*/node_modules/*' \
    -not -path '*/.pi/sessions/*' \
    2>/dev/null | while read -r f; do
    # Output mtime (epoch) and path
    stat -f '%m %N' "$f" 2>/dev/null
  done | sort -rn | awk '!seen[$2]++ { print $2 }' > "$TMPFILE"

  # Redraw
  clear
  echo "── Modified files (since session start) ──"
  echo ""
  if [ -s "$TMPFILE" ]; then
    # Show paths relative to watched dir
    while read -r path; do
      rel="${path#$DIR/}"
      echo "  $rel"
    done < "$TMPFILE"
  else
    echo "  (none yet)"
  fi
  echo ""
  echo "── watching: $DIR ──"

  sleep 2
done
