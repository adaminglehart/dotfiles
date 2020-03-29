# symlink from install location to home directory
ln -s $(pwd) $HOME/.dotfiles

# install oh-my-zsh
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
