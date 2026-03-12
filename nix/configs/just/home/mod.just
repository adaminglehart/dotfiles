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
