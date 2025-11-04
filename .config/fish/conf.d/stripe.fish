if test "$ENVIRONMENT" = stripe
    echo "loading stripe config"
    # Added by `nodenv init` on Thu Sep  4 10:41:35 EDT 2025
    status --is-interactive; and nodenv init - --no-rehash fish | source

    nodenv shell 22.18.0

    set -gx PATH ~/stripe/space-commander/bin $PATH
end
