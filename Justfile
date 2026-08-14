environment := env_var_or_default("MISE_ENV", "home")

trust:
    mise trust

status:
    mise --env {{ environment }} bootstrap status

plan:
    mise --env {{ environment }} bootstrap plan

dry-run:
    mise --env {{ environment }} bootstrap --dry-run

packages-status:
    mise --env {{ environment }} bootstrap packages status

apply:
    mise --env {{ environment }} bootstrap

macos-status:
    mise --env {{ environment }} bootstrap macos defaults status

macos-dry-run:
    mise --env {{ environment }} bootstrap macos defaults apply --dry-run

macos-apply:
    mise --env {{ environment }} bootstrap macos defaults apply

login-shell:
    #!/usr/bin/env bash
    set -euo pipefail
    fish_bin="$(command -v fish)"
    if ! grep -Fqx "$fish_bin" /etc/shells; then
        printf '%s\n' "$fish_bin" | sudo tee -a /etc/shells >/dev/null
    fi
    chsh -s "$fish_bin"

setup: trust apply login-shell
