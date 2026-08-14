echo "loading stripe config"
status --is-interactive; and nodenv init - --no-rehash fish | source
nodenv shell 22.18.0
fish_add_path ~/stripe/space-commander/bin
set -gx CARGO_HOME "~/stripe/.cargo"
