# Tab completions for gwt (git worktree utility)

# Main command completions
complete -c gwt -f

complete -c gwt -n "__fish_use_subcommand" -a "create" -d "Create a new worktree"
complete -c gwt -n "__fish_use_subcommand" -a "list" -d "List all worktrees"
complete -c gwt -n "__fish_use_subcommand" -a "switch" -d "Switch to a worktree"
complete -c gwt -n "__fish_use_subcommand" -a "goto" -d "Switch to a worktree"
complete -c gwt -n "__fish_use_subcommand" -a "remove" -d "Remove a worktree"
complete -c gwt -n "__fish_use_subcommand" -a "path" -d "Show worktree path for a branch"
complete -c gwt -n "__fish_use_subcommand" -a "help" -d "Show help"

# Branch name completion for 'create' and 'path' commands
complete -c gwt -n "__fish_seen_subcommand_from create c path p" -a "(git branch --format='%(refname:short)' 2>/dev/null)"

# Worktree path completion for 'remove' command
# Lists managed worktrees under ~/worktrees for the current repo
function __gwt_complete_worktrees
    set -l repo_name (git rev-parse --show-toplevel 2>/dev/null | xargs basename)
    if test -n "$repo_name"
        for dir in ~/worktrees/$repo_name/*/
            if test -d "$dir"
                echo (basename "$dir")
            end
        end
    end
end

complete -c gwt -n "__fish_seen_subcommand_from remove rm r" -a "(__gwt_complete_worktrees)"
