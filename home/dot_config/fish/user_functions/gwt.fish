# Git Worktree Utility
# Manages git worktrees in ~/worktrees/

function gwt -a cmd --description "Git worktree utility"
    set -l worktree_base ~/worktrees

    switch "$cmd"
        case create c
            _gwt_create $argv[2..-1]
        case list ls l
            _gwt_list
        case switch sw s goto g
            _gwt_switch
        case remove rm r
            _gwt_remove $argv[2..-1]
        case path p
            _gwt_path $argv[2]
        case help h --help -h
            _gwt_help
        case ''
            # Default to list if no command given
            _gwt_list
        case '*'
            echo "Unknown command: $cmd"
            _gwt_help
            return 1
    end
end

function _gwt_help
    echo "Usage: gwt <command> [options]"
    echo ""
    echo "Commands:"
    echo "  create, c [branch]     Create a new worktree (uses current branch name if not specified)"
    echo "  list, ls, l            List all worktrees with their branches"
    echo "  switch, sw, s, goto, g  Interactive switch to a worktree using fzf"
    echo "  remove, rm, r <path>   Remove a worktree (path can be relative to ~/worktrees/)"
    echo "  path, p [branch]       Show the path for a worktree (current branch if not specified)"
    echo "  help, h                Show this help message"
    echo ""
    echo "Worktrees are stored in: ~/worktrees/<repo-name>/<branch>/"
end

function _gwt_ensure_in_git_repo
    if not git rev-parse --git-dir > /dev/null 2>&1
        echo "Error: Not in a git repository"
        return 1
    end
end

function _gwt_get_repo_name
    git rev-parse --show-toplevel | xargs basename
end

function _gwt_get_current_branch
    git branch --show-current
end

function _gwt_create -a branch_name
    _gwt_ensure_in_git_repo
    if test $status -ne 0
        return 1
    end

    set -l repo_name (_gwt_get_repo_name)

    # Use provided branch name or current branch
    if test -z "$branch_name"
        set branch_name (_gwt_get_current_branch)
        if test -z "$branch_name"
            echo "Error: No branch name provided and not on a branch (detached HEAD)"
            return 1
        end
    end

    # Sanitize branch name for directory name (replace / with -)
    set -l dir_name (string replace -a '/' '-' "$branch_name")
    set -l worktree_path ~/worktrees/$repo_name/$dir_name

    # Check if worktree already exists
    if test -d "$worktree_path"
        echo "Worktree already exists at: $worktree_path"
        echo "Run 'gwt switch' to navigate to it"
        return 1
    end

    # Create the worktree
    echo "Creating worktree for branch '$branch_name' at $worktree_path"
    mkdir -p (dirname $worktree_path)

    # Check if branch exists, create if not
    if not git show-ref --quiet refs/heads/$branch_name
        echo "Branch '$branch_name' does not exist, creating..."
        git branch $branch_name
    end

    git worktree add $worktree_path $branch_name
    if test $status -eq 0
        echo "Worktree created successfully!"
        echo "Path: $worktree_path"
        echo ""
        echo "To switch to it, run: gwt switch"
    else
        echo "Error: Failed to create worktree"
        return 1
    end
end

function _gwt_list
    _gwt_ensure_in_git_repo
    if test $status -ne 0
        return 1
    end

    set -l repo_name (_gwt_get_repo_name)
    set -l main_toplevel (git rev-parse --show-toplevel)

    echo "Worktrees for $repo_name:"
    echo ""

    # Read all output first to avoid subshell issues with the pipe
    set -l worktree_output (git worktree list --porcelain 2>/dev/null)

    set -l wt_path ""
    set -l wt_branch ""

    for line in $worktree_output
        switch "$line"
            case 'worktree *'
                set wt_path (string replace 'worktree ' '' $line)
            case 'branch *'
                set -l branch_ref (string replace 'branch ' '' $line)
                set wt_branch (string replace 'refs/heads/' '' $branch_ref)
            case ''
                # End of worktree entry, print it
                if test -n "$wt_path"
                    set -l marker "  "

                    # Check if this is a managed worktree (under ~/worktrees)
                    if string match -q "$HOME/worktrees/*" $wt_path
                        set marker "* "
                    end

                    # Check if it's the main worktree
                    if test "$wt_path" = "$main_toplevel"
                        set marker "@ "
                        set wt_branch "$wt_branch (main)"
                    end

                    printf "%s%-30s %s\n" $marker $wt_branch $wt_path
                end
                set wt_path ""
                set wt_branch ""
        end
    end

    echo ""
    echo "Legend: @ = main worktree, * = managed worktree (~/worktrees/)"
end

function _gwt_switch
    _gwt_ensure_in_git_repo
    if test $status -ne 0
        return 1
    end

    set -l repo_name (_gwt_get_repo_name)
    set -l main_toplevel (git rev-parse --show-toplevel)

    # Check if fzf is available
    if not type -q fzf
        echo "Error: fzf is required for interactive switching"
        echo "Install it with: brew install fzf"
        return 1
    end

    # Build list of worktrees for fzf - read output first to avoid subshell issues
    set -l worktree_output (git worktree list --porcelain 2>/dev/null)
    set -l fzf_list

    set -l wt_path ""
    set -l wt_branch ""

    for line in $worktree_output
        switch "$line"
            case 'worktree *'
                set wt_path (string replace 'worktree ' '' $line)
            case 'branch *'
                set -l branch_ref (string replace 'branch ' '' $line)
                set wt_branch (string replace 'refs/heads/' '' $branch_ref)
            case ''
                if test -n "$wt_path"
                    # Only include managed worktrees from ~/worktrees or the main repo
                    if string match -q "$HOME/worktrees/*" $wt_path; or test "$wt_path" = "$main_toplevel"
                        if test -n "$wt_branch"
                            set -a fzf_list "$wt_branch|$wt_path"
                        end
                    end
                end
                set wt_path ""
                set wt_branch ""
        end
    end

    if test (count $fzf_list) -eq 0
        echo "No worktrees found"
        return 1
    end

    # Pipe the list to fzf
    printf "%s\n" $fzf_list | fzf --prompt "Select worktree: " --preview "echo 'Branch: {1}'; echo 'Path: {2}'" --delimiter '|' | read -l selection

    if test -n "$selection"
        set -l selected_path (echo $selection | cut -d'|' -f2)
        echo "Changing to: $selected_path"
        cd $selected_path
    else
        echo "No worktree selected"
    end
end

function _gwt_remove -a worktree_path
    _gwt_ensure_in_git_repo
    if test $status -ne 0
        return 1
    end

    if test -z "$worktree_path"
        echo "Error: No worktree path specified"
        echo "Usage: gwt remove <path>"
        return 1
    end

    set -l repo_name (_gwt_get_repo_name)
    set -l full_path

    # If path doesn't start with /, assume it's relative to worktrees dir
    if not string match -q '/*' $worktree_path
        set full_path ~/worktrees/$repo_name/$worktree_path
    else
        set full_path $worktree_path
    end

    # Confirm removal
    echo "This will remove the worktree at: $full_path"
    read -l -P "Are you sure? [y/N] " confirm

    if test "$confirm" != "y" -a "$confirm" != "Y"
        echo "Cancelled"
        return 0
    end

    # Remove the worktree
    git worktree remove $full_path 2>/dev/null
    if test $status -ne 0
        echo "Failed to remove cleanly, trying force removal..."
        git worktree remove --force $full_path
    end

    # Clean up empty directories
    set -l parent_dir (dirname $full_path)
    if test -d "$parent_dir"
        rmdir $parent_dir 2>/dev/null
    end

    echo "Worktree removed"
end

function _gwt_path -a branch_name
    _gwt_ensure_in_git_repo
    if test $status -ne 0
        return 1
    end

    set -l repo_name (_gwt_get_repo_name)

    if test -z "$branch_name"
        set branch_name (_gwt_get_current_branch)
    end

    set -l dir_name (string replace -a '/' '-' "$branch_name")
    echo ~/worktrees/$repo_name/$dir_name
end