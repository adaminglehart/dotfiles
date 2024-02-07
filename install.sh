#!/bin/sh
set -x
echo "Setting up your Mac..."

# Update Homebrew recipes
brew update

# Install all our dependencies with bundle (See Brewfile)
brew tap homebrew/bundle
brew bundle --file brewfiles/Brewfile.home

# TODO: it doesnt see fisher
fisher update
# fisher install jethrokuan/z
# fisher install PatrickF1/fzf.fish


# Symlink the Mackup config file to the home directory
# ln -s $HOME/.dotfiles/.mackup.cfg $HOME/.mackup.cfg

# Set macOS preferences
# We will run this last because this will reload the shell
source .macos