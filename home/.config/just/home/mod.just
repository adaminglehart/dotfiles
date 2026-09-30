[private]
environment := env_var_or_default("MISE_ENV", "home")

default:
    just -l

pull:
    git -C ~/dev/dotfiles pull --ff-only

status:
    cd ~/dev/dotfiles && mise --env {{ environment }} bootstrap status

apply:
    cd ~/dev/dotfiles && mise --env {{ environment }} bootstrap

check:
    cd ~/dev/dotfiles && mise --env {{ environment }} bootstrap --dry-run

pi-tools:
    mise install
    mise exec node@latest -- npm install -g @mariozechner/pi-coding-agent
    mise exec node@latest -- npm install -g @tobilu/qmd
