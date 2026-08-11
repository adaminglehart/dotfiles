#!/usr/bin/env fish

set -l plugin_root (cd (dirname (status filename)); and pwd)
set -l roots ("$plugin_root/run.fish" --picker-roots)
if test $status -ne 0; or test (count $roots) -eq 0
    exit 1
end

set -l choices (mktemp -t herdr-directory-picker)
begin
    for root in $roots
        if test -d "$root"
            printf '%s\n' "$root"
            fd --absolute-path --type d --hidden --exclude .git --exclude node_modules --exclude .cache . "$root"
        end
    end
end | sort -u | fzf --prompt='New space directory> ' --height=100% >"$choices"
set -l picker_status $pipestatus[-1]
if test "$picker_status" -ne 0
    rm -f "$choices"
    exit 0
end

set -l directory (string trim <"$choices")
rm -f "$choices"
if test -z "$directory"
    exit 0
end

set -l herdr_bin $HERDR_BIN_PATH
if test -z "$herdr_bin"
    set herdr_bin herdr
end
exec "$herdr_bin" workspace create --cwd "$directory" --focus
