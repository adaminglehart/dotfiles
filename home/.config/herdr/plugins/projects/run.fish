#!/usr/bin/env fish

set -l plugin_root $HERDR_PLUGIN_ROOT
if test -z "$plugin_root"
    set plugin_root (cd (dirname (status filename)); and pwd)
end

set -l state_dir $HERDR_PLUGIN_STATE_DIR
if test -z "$state_dir"
    set state_dir "$HOME/.local/state/herdr/projects"
end
mkdir -p "$state_dir"

set -l binary "$state_dir/projects"
set -l rebuild 0
if not test -x "$binary"
    set rebuild 1
else
    for source in "$plugin_root/main.go" "$plugin_root/go.mod" "$plugin_root/go.sum"
        if test "$source" -nt "$binary"
            set rebuild 1
            break
        end
    end
end

if test "$rebuild" -eq 1
    set -l temporary "$binary."(random)
    pushd "$plugin_root" >/dev/null
    mise exec go@1.25.5 -- go build -o "$temporary" .
    set -l build_status $status
    popd >/dev/null
    if test "$build_status" -ne 0
        rm -f "$temporary"
        exit 1
    end
    mv -f "$temporary" "$binary"
end

exec "$binary" $argv
