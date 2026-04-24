# Auto-wrap pi in tmux session
function pi --description "Launch pi inside tmux"
    # If PI_NO_TMUX is set, run pi directly without tmux
    if set -q PI_NO_TMUX
        command pi $argv
        return $status
    end

    # If already in tmux, run pi directly
    if set -q TMUX
        command pi $argv
        return $status
    end

    # If running 'pi update', update npm package first, then run pi update directly (no tmux)
    if test "$argv[1]" = "update"
        echo "Updating @mariozechner/pi-coding-agent via npm..."
        npm update -g @mariozechner/pi-coding-agent
        echo "Running pi update..."
        command pi $argv
        return $status
    end

    # If not in tmux, launch pi in a NEW tmux session every time
    # Generate unique session name with timestamp
    set -l timestamp (date +%s)
    set -l session_name "pi-$timestamp"

    echo "Creating new tmux session: $session_name"
    tmux new-session -s $session_name -c (pwd) "exec pi $argv"
end
