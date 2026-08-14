### BEGIN STRIPE
# All Stripe related shell configuration
# is at ~/.stripe/shellinit/bashrc and is
# persistently managed by Chef. You shouldn't
# remove this unless you don't want to load
# Stripe specific shell configurations.
#
# Feel free to add your customizations in this
# file (~/.bashrc) after the Stripe config
# is sourced.
[ -f ~/.stripe/shellinit/bashrc ] && source ~/.stripe/shellinit/bashrc
### END STRIPE
# mise shims - ensures tools are available in non-interactive bash subshells (e.g. just)
export PATH="$HOME/.local/share/mise/shims:$PATH"
