function op_cached --description "Get 1Password value with local caching"
    argparse 'r/refresh' 'h/help' -- $argv
    or return 1

    if set -q _flag_help
        echo "Usage: op_cached [OPTIONS] <op://reference> [ttl_hours]"
        echo ""
        echo "Options:"
        echo "  -r, --refresh  Force refresh from 1Password, ignoring cache"
        echo "  -h, --help     Show this help"
        echo ""
        echo "Examples:"
        echo "  op_cached 'op://vault/item/field'        # Cache for 24h (default)"
        echo "  op_cached 'op://vault/item/field' 48     # Cache for 48h"
        echo "  op_cached --refresh 'op://vault/item/field'  # Force refresh"
        return 0
    end

    set -l key $argv[1]
    set -l ttl_hours $argv[2]
    test -z "$ttl_hours"; and set ttl_hours 24

    if test -z "$key"
        echo "Error: op:// reference required" >&2
        return 1
    end

    set -l cache_dir ~/.cache/op_env
    set -l cache_file $cache_dir/(echo $key | string replace -a '/' '_')

    # Check if cache exists and is fresh (unless --refresh)
    if not set -q _flag_refresh; and test -f $cache_file
        set -l file_mod (stat -f %m $cache_file)
        set -l now (date +%s)
        set -l age_hours (math "($now - $file_mod) / 3600")
        if test $age_hours -lt $ttl_hours
            cat $cache_file
            return 0
        end
    end

    # Fetch from 1Password and cache
    mkdir -p $cache_dir
    set -l value (echo $key | op inject 2>/dev/null)
    if test $status -eq 0
        echo $value > $cache_file
        chmod 600 $cache_file
        cat $cache_file
    else
        # If op inject fails but cache exists, use stale cache as fallback
        if test -f $cache_file
            cat $cache_file
        else
            echo "Error: Failed to fetch from 1Password" >&2
            return 1
        end
    end
end
