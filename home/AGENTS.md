# AGENTS.md

This file provides guidance to coding agents on my personal preferences for workflows and coding style.

## Git

I use [graphite](https://graphite.dev/docs/get-started) for my git workflow. This allows for creating stacks of PRs that are managed together. I will provide the commands to use as replacements for the default git commands.

- To create a branch, use `gt create -m <commit message>`
- To submit a branch and create a pull request, use `gt submit`
- to submit changes to an existing branch use gt modify && gt submit --stack --update-only
- To sync the latest changes from remote, use `gt sync`
- To check out a particular branch, use `gt co <branch name>`
