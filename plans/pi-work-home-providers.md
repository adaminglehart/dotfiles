## Goal
Set up `pi` agent configuration so work and home environments use different provider definitions via chezmoi templating, reusing the same Stripe work-provider pattern already used by `opencode`, and update every other model/provider reference that must stay consistent with that split.

## Phases

### Phase 1: Audit all pi model and provider references
- **Deliverable**: complete list of files and fields that encode model IDs or provider names and must be kept in sync across environments
- **Files**:
  - `home/private_dot_pi/private_agent/settings.json.tmpl`
  - `home/private_dot_pi/private_agent/models.json`
  - `home/private_dot_pi/private_agent/extensions/smart-router/src/classifier.ts`
  - `home/private_dot_pi/private_agent/extensions/smart-router/src/tiers.ts`
  - `home/dot_local/bin/executable_pi-session`
  - `home/dot_config/pi/bake/docker-client.ts`
- **Dependencies**: none
- **Verify**: search the repo for model/provider literals and confirm each live reference is accounted for in the plan, including `selfLearning.model`

### Phase 2: Split pi settings and provider definitions by environment
- **Deliverable**: environment-aware chezmoi templates for `~/.pi/agent/settings.json` and `~/.pi/agent/models.json`
- **Files**:
  - `home/private_dot_pi/private_agent/settings.json.tmpl`
  - `home/private_dot_pi/private_agent/models.json`
  - `home/.chezmoitemplates/pi/settings.base.json.tmpl`
  - `home/.chezmoitemplates/pi/settings.home.json.tmpl`
  - `home/.chezmoitemplates/pi/settings.work.json.tmpl`
  - `home/.chezmoitemplates/pi/models.base.json.tmpl`
  - `home/.chezmoitemplates/pi/models.home.json.tmpl`
  - `home/.chezmoitemplates/pi/models.work.json.tmpl`
- **Dependencies**: Phase 1
- **Verify**: render both environments with `chezmoi execute-template` and confirm home renders the current/home providers while work renders Stripe-backed providers modeled after `opencode`

### Phase 3: Make smart-router and extension model selection environment-aware
- **Deliverable**: smart-router defaults switch between home providers and work providers without manual edits
- **Files**:
  - `home/private_dot_pi/private_agent/extensions/smart-router/src/classifier.ts`
  - `home/private_dot_pi/private_agent/extensions/smart-router/src/tiers.ts`
- **Dependencies**: Phase 2
- **Verify**: inspect rendered config for both environments and confirm extension-specific references, including smart-router and self-learning, line up with the models declared in the rendered `models.json`

### Phase 4: Align pi session launcher defaults with the selected environment
- **Deliverable**: session launcher defaults use the matching default model for each environment
- **Files**:
  - `home/dot_local/bin/executable_pi-session`
  - `home/dot_config/pi/bake/docker-client.ts`
- **Dependencies**: Phase 2
- **Verify**: render the files for both environments and confirm the default model matches the rendered `settings.json`

## Risks
- The Stripe Gemini route in `opencode` is OpenAI-compatible, so `pi` likely needs a custom provider entry rather than a simple override of the built-in `google` provider.
- The work model list in `opencode` does not include the current `pi` default (`claude-sonnet-4-6`), so work defaults likely need to move to an available Stripe model unless we intentionally define additional models.
- Existing uncommitted changes already exist in `home/.chezmoitemplates/opencode/work.json.tmpl`; this plan does not modify that file.
