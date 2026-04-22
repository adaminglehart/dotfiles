# Git Worktree Utility
# Manages git worktrees in ~/worktrees/
# Requires: gum (https://github.com/charmbracelet/gum)

function gwt -a cmd --description "Git worktree utility"
    if not type -q gum
        echo "Error: gum is required (brew install gum)"
        return 1
    end

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
            gum log --level error "Unknown command: $cmd"
            _gwt_help
            return 1
    end
end

function _gwt_help
    gum style --bold "Usage: gwt <command> [options]"
    echo ""
    echo "Commands:"
    echo "  create, c [branch]      Create a new worktree (prompts for branch if not specified)"
    echo "  list, ls, l             List all worktrees with their branches"
    echo "  switch, sw, s, goto, g  Interactive switch to a worktree"
    echo "  remove, rm, r [path]    Remove a worktree (interactive picker if no path given)"
    echo "  path, p [branch]        Show the path for a worktree (current branch if not specified)"
    echo "  help, h                 Show this help message"
    echo ""
    gum style --faint "Worktrees are stored in: ~/worktrees/<repo-name>/<branch>/"
end

function _gwt_ensure_in_git_repo
    if not git rev-parse --git-dir >/dev/null 2>&1
        gum log --level error "Not in a git repository"
        return 1
    end
end

function _gwt_get_repo_name
    git rev-parse --show-toplevel | xargs basename
end

function _gwt_get_current_branch
    git branch --show-current
end

# Parse git worktree list --porcelain into parallel arrays.
# Sets caller variables: _wt_paths, _wt_branches
function _gwt_parse_worktrees
    set -l worktree_output (git worktree list --porcelain 2>/dev/null)

    set -g _wt_paths
    set -g _wt_branches

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
                    set -a _wt_paths $wt_path
                    set -a _wt_branches $wt_branch
                end
                set wt_path ""
                set wt_branch ""
        end
    end
end

function _gwt_create -a branch_name
    _gwt_ensure_in_git_repo; or return 1

    set -l repo_name (_gwt_get_repo_name)

    # Prompt for branch name if not provided
    if test -z "$branch_name"
        set -l default_branch (_gwt_get_current_branch)
        if test -z "$default_branch"
            set branch_name (gum input --placeholder "branch-name" --header "Branch name:")
        else
            set branch_name (gum input --placeholder "$default_branch" --value "$default_branch" --header "Branch name:")
        end

        if test -z "$branch_name"
            gum log --level warn "No branch name provided"
            return 1
        end
    end

    # Sanitize branch name for directory name (replace / with -)
    set -l dir_name (string replace -a '/' '-' "$branch_name")
    set -l worktree_path ~/worktrees/$repo_name/$dir_name

    # Check if worktree already exists
    if test -d "$worktree_path"
        gum log --level warn "Worktree already exists at: $worktree_path"
        gum log --level info "Run 'gwt switch' to navigate to it"
        return 1
    end

    mkdir -p (dirname $worktree_path)

    # Check if branch exists, create if not
    if not git show-ref --quiet refs/heads/$branch_name
        gum log --level info "Branch '$branch_name' does not exist, creating..."
        git branch $branch_name
    end

    gum spin --spinner dot --title "Creating worktree for '$branch_name'..." -- git worktree add $worktree_path $branch_name
    if test $status -eq 0
        gum log --level info "Worktree created at $worktree_path"
        gum log --level info "Run 'gwt switch' to navigate to it"
    else
        gum log --level error "Failed to create worktree"
        return 1
    end
end

function _gwt_list
    _gwt_ensure_in_git_repo; or return 1

    set -l repo_name (_gwt_get_repo_name)
    set -l main_toplevel (git rev-parse --show-toplevel)

    _gwt_parse_worktrees

    if test (count $_wt_paths) -eq 0
        gum log --level info "No worktrees found for $repo_name"
        return 0
    end

    gum style --bold "Worktrees for $repo_name"
    for i in (seq (count $_wt_paths))
        set -l wt_path $_wt_paths[$i]
        set -l wt_branch $_wt_branches[$i]
        set -l short_path (string replace "$HOME" "~" $wt_path)

        if test "$wt_path" = "$main_toplevel"
            echo "  @ $wt_branch  $short_path"
        else if string match -q "$HOME/worktrees/*" $wt_path
            echo "  * $wt_branch  $short_path"
        else
            echo "    $wt_branch  $short_path"
        end
    end
end

function _gwt_switch
    _gwt_ensure_in_git_repo; or return 1

    set -l repo_name (_gwt_get_repo_name)
    set -l main_toplevel (git rev-parse --show-toplevel)

    _gwt_parse_worktrees

    # Build display labels and matching paths
    set -l labels
    set -l paths

    for i in (seq (count $_wt_paths))
        set -l wt_path $_wt_paths[$i]
        set -l wt_branch $_wt_branches[$i]

        # Only include managed worktrees and the main repo
        if string match -q "$HOME/worktrees/*" $wt_path; or test "$wt_path" = "$main_toplevel"
            if test -n "$wt_branch"
                set -l label $wt_branch
                if test "$wt_path" = "$main_toplevel"
                    set label "$wt_branch (main)"
                end
                set -a labels $label
                set -a paths $wt_path
            end
        end
    end

    if test (count $labels) -eq 0
        gum log --level warn "No worktrees found"
        return 1
    end

    set -l selection (printf "%s\n" $labels | gum choose --header "Switch to worktree:")

    if test -z "$selection"
        return 0
    end

    # Find the matching path
    for i in (seq (count $labels))
        if test "$labels[$i]" = "$selection"
            gum log --level info "Switching to $paths[$i]"
            cd $paths[$i]
            return 0
        end
    end
end

function _gwt_remove -a worktree_path
    _gwt_ensure_in_git_repo; or return 1

    set -l repo_name (_gwt_get_repo_name)
    set -l main_toplevel (git rev-parse --show-toplevel)
    set -l full_path

    if test -z "$worktree_path"
        # Interactive picker (same as switch, but excludes main worktree)
        _gwt_parse_worktrees

        set -l labels
        set -l paths

        for i in (seq (count $_wt_paths))
            set -l wt_path $_wt_paths[$i]
            set -l wt_branch $_wt_branches[$i]

            # Only include managed worktrees, exclude main repo
            if string match -q "$HOME/worktrees/*" $wt_path
                if test -n "$wt_branch"
                    set -a labels $wt_branch
                    set -a paths $wt_path
                end
            end
        end

        if test (count $labels) -eq 0
            gum log --level warn "No removable worktrees found"
            return 1
        end

        set -l selection (printf "%s\n" $labels | gum choose --header "Remove worktree:")

        if test -z "$selection"
            return 0
        end

        # Find the matching path
        for i in (seq (count $labels))
            if test "$labels[$i]" = "$selection"
                set full_path $paths[$i]
                break
            end
        end
    else
        # If path doesn't start with /, assume it's relative to worktrees dir
        if not string match -q '/*' $worktree_path
            set full_path ~/worktrees/$repo_name/$worktree_path
        else
            set full_path $worktree_path
        end

        if not test -d "$full_path"
            gum log --level error "Worktree not found: $full_path"
            return 1
        end
    end

    # Check for uncommitted changes
    set -l dirty (git -C $full_path status --porcelain 2>/dev/null)
    if test -n "$dirty"
        gum log --level warn "Worktree has uncommitted changes:"
        git -C $full_path status --short
        if not gum confirm --default=false "Discard these changes and remove anyway?"
            gum log --level info "Cancelled"
            return 0
        end
    end

    # Confirm removal
    if not gum confirm "Remove worktree at $full_path?"
        gum log --level info "Cancelled"
        return 0
    end

    # Remove the worktree
    git worktree remove $full_path 2>/dev/null
    if test $status -ne 0
        gum log --level warn "Failed to remove cleanly, trying force removal..."
        git worktree remove --force $full_path
    end

    # Clean up empty directories
    set -l parent_dir (dirname $full_path)
    if test -d "$parent_dir"
        rmdir $parent_dir 2>/dev/null
    end

    gum log --level info "Worktree removed"
end

function _gwt_path -a branch_name
    _gwt_ensure_in_git_repo; or return 1

    set -l repo_name (_gwt_get_repo_name)

    if test -z "$branch_name"
        set branch_name (_gwt_get_current_branch)
    end

    set -l dir_name (string replace -a '/' '-' "$branch_name")
    echo ~/worktrees/$repo_name/$dir_name
end
