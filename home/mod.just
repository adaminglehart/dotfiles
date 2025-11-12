init:
  chezmoi init adaminglehart/dotfiles --branch=chezmoi --ssh

pull:
  chezmoi update --apply=false

update:
  chezmoi update

check:
  chezmoi apply --dry-run