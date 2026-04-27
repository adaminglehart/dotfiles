# Launch pi with fnox env loading (tmux disabled by default)
function pi --description "Launch pi with fnox secrets"
    # If PI_CODING_AGENT_DIR is not set, default to coding profile
    if not set -q PI_CODING_AGENT_DIR
        set -gx PI_CODING_AGENT_DIR /Users/adaminglehart/.pi/agent
    end

    # Set up base command
    set -l pi_cmd "command pi"

    # If fnox.toml exists, wrap with fnox exec
    # PI_CODING_AGENT_DIR needs to be visible to fnox exec
    if test -f $PI_CODING_AGENT_DIR/fnox.toml
        set pi_cmd "fnox exec --config $PI_CODING_AGENT_DIR/fnox.toml -- $pi_cmd"
    end

    # If PI_USE_TMUX is set to true, wrap in tmux; otherwise run directly
    if not set -q PI_USE_TMUX; or test "$PI_USE_TMUX" != "true"
        eval $pi_cmd $argv
        return $status
    end

    # If already in tmux, run pi directly
    if set -q TMUX
        eval $pi_cmd $argv
        return $status
    end

    # If running 'pi update', update npm package first, then run pi update directly (no tmux)
    if test "$argv[1]" = "update"
        echo "Updating @mariozechner/pi-coding-agent via npm..."
        npm update -g @mariozechner/pi-coding-agent
        echo "Running pi update..."
        eval $pi_cmd $argv
        return $status
    end

    # If not in tmux, launch pi in a NEW tmux session every time
    # Generate unique session name with timestamp
    set -l timestamp (date +%s)
    set -l session_name "pi-$timestamp"

    echo "Creating new tmux session: $session_name"
    tmux new-session -s $session_name -c (pwd) "exec pi $argv"
end
