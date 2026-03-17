[private]
default:
    just -l

init:
    chezmoi init adaminglehart/dotfiles --branch=chezmoi --ssh

pull:
    chezmoi update --apply=false

apply:
    chezmoi apply

check:
    chezmoi apply --dry-run

pi-tools:
    mise install
    mise exec node@latest -- npm install -g @mariozechner/pi-coding-agent
    mise exec node@latest -- npm install -g @tobilu/qmd
