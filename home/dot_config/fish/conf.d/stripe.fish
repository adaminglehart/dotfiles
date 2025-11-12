if test -f "~/stripe/space-commander/bin"
    echo "loading stripe config"
    # Added by `nodenv init` on Thu Sep  4 10:41:35 EDT 2025
    status --is-interactive; and nodenv init - --no-rehash fish | source

    nodenv shell 22.18.0

    fish_add_path ~/stripe/space-commander/bin
end
