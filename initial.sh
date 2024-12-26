# symlink from install location to home directory
# ln -s $(pwd) $HOME/.dotfiles

# Check for Homebrew and install if we don't have it
if test ! $(which brew); then
    echo "Installing Homebrew"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh)"
fi
