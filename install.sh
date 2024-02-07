#!/bin/bash
set -x
echo "Setting up your Mac..."

# Update Homebrew recipes
brew update

# Install all our dependencies with bundle (See Brewfile)
brew tap homebrew/bundle
brew bundle --file brewfiles/Brewfile.home

fisher brew install 
fisher update
# Symlink the Mackup config file to the home directory
# ln -s $HOME/.dotfiles/.mackup.cfg $HOME/.mackup.cfg

stow --target=/Users/$(whoami)/.config .config/

# Set macOS preferences
# We will run this last because this will reload the shell
source .macos