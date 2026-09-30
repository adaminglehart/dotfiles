function op_cache_clear --description "Clear 1Password environment cache"
    argparse 'h/help' -- $argv
    or return 1

    if set -q _flag_help
        echo "Usage: op_cache_clear [pattern]"
        echo ""
        echo "Clear all cached 1Password values, or those matching a pattern."
        echo ""
        echo "Examples:"
        echo "  op_cache_clear              # Clear all cached values"
        echo "  op_cache_clear 'homelab*'   # Clear values matching pattern"
        return 0
    end

    set -l cache_dir ~/.cache/op_env

    if not test -d $cache_dir
        echo "Cache directory does not exist"
        return 0
    end

    if test -n "$argv[1]"
        set -l pattern $argv[1]
        set -l files $cache_dir/*$pattern*
        if test -n "$files"
            rm -f $files
            echo "Cleared cache files matching: $pattern"
        else
            echo "No cache files match: $pattern"
        end
    else
        rm -rf $cache_dir
        echo "Cleared all 1Password cache"
    end
end
