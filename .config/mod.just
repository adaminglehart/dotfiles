init:
  chezmoi init adaminglehart/homelab --branch=chezmoi

sync:
  chezmoi --config ./chezmoi/chezmoi.yaml apply --dry-run --verbose
