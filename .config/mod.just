init:
  chezmoi init adaminglehart/dotfiles --branch=chezmoi --ssh

sync:
  chezmoi --config ./chezmoi/chezmoi.yaml apply --dry-run --verbose
