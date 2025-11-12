init:
  chezmoi init adaminglehart/dotfiles --branch=chezmoi --ssh

update:
  chezmoi update

diff:
  chezmoi apply --dry-run

sync:
  chezmoi apply
