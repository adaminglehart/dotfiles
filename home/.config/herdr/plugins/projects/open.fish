#!/usr/bin/env fish

set -l herdr_bin $HERDR_BIN_PATH
if test -z "$herdr_bin"
    set herdr_bin herdr
end

exec "$herdr_bin" plugin pane open --plugin "$HERDR_PLUGIN_ID" --entrypoint picker
