# Pi provider flexibility

## Context

Current state:
- **home**: uses OpenRouter (all models route through OpenRouter)
- **work**: uses direct API keys (ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY)
- **Problem**: Model IDs differ by provider (OpenRouter uses namespaced IDs like `anthropic/claude-sonnet-4.6`, built-in providers use bare IDs like `claude-sonnet-4-6`)
- **Duplicate entries**: `settings.json.tmpl` has both `anthropic/claude-sonnet-4-6` and `anthropic/claude-sonnet-4.6` (mixed provider conventions)
- **Hard-coded endpoints**: smart-router tier definitions hardcode `provider: "openrouter"` and OpenRouter-style model IDs
- **Goal**: Canonical model/provider references everywhere; environment-specific routing happens transparently in one place

## Canonical model catalog

Canonical names (used everywhere else):

| Tier | Canonical Provider | Canonical Model ID | Thinking |
|------|-------------------|-------------------|----------|
| fast | anthropic | claude-haiku-4.5 | off |
| standard | anthropic | claude-sonnet-4.6 | off |
| power | openai | gpt-5.4 | high |

Self-learning:
- Provider: `google`
- Model: `gemini-2.5-flash`

## Proposed approach

1. **Provider Profile** (`home/private_dot_pi/private_agent/provider-profile.json.tmpl`):
   - Single chezmoi-templated JSON that maps canonical providers → environment-specific backends
   - **home**: anthropic/openai/google → OpenRouter (base: https://openrouter.ai/api/v1, key: OPENROUTER_API_KEY, upstream IDs: `anthropic/claude-...`, `openai/gpt-...`, `google/gemini-...`)
   - **work**: anthropic → built-in (base: Anthropic native, key: ANTHROPIC_API_KEY, upstream IDs: `claude-...`)
     - openai → built-in (base: OpenAI native, key: OPENAI_API_KEY, upstream IDs: `gpt-...`)
     - google → built-in (base: Google native, key: GEMINI_API_KEY, upstream IDs: `gemini-...`)

2. **Provider Router Extension** (`home/private_dot_pi/private_agent/extensions/provider-router.ts`):
   - Loads provider-profile.json at session_start
   - Registers canonical providers using pi.registerProvider()
   - Implements model-ID rewriting via before_provider_request hook
   - Canonical IDs stay in session/UI; only outgoing payloads see upstream IDs

3. **Smart-router refactor** (`home/private_dot_pi/private_agent/extensions/smart-router/src/tiers.ts`):
   - Replace hardcoded tier definitions with canonical provider/model IDs
   - Let the provider-router extension handle the mapping to actual backends
   - fast → `anthropic/claude-haiku-4.5`
   - standard → `anthropic/claude-sonnet-4.6`
   - power → `openai/gpt-5.4`

4. **Settings cleanup** (`home/private_dot_pi/private_agent/settings.json.tmpl`):
   - Remove duplicate model entries
   - Use only canonical IDs
   - Update selfLearning model to reference canonical `google/gemini-2.5-flash`

5. **Models.json**:
   - Leave empty or remove dependency (provider-router extension handles all registration)

## Files to modify

- [x] Create: `home/private_dot_pi/private_agent/provider-profile.json.tmpl`
- [x] Create: `home/private_dot_pi/private_agent/extensions/provider-router.ts`
- [ ] Update: `home/private_dot_pi/private_agent/settings.json.tmpl`
- [ ] Update: `home/private_dot_pi/private_agent/extensions/smart-router/src/tiers.ts`
- [ ] Update: `home/private_dot_pi/private_agent/extensions/smart-router/src/classifier.ts`
- [ ] Review: `home/private_dot_pi/private_agent/models.json` (likely leave as-is, empty)
- [ ] Review: `home/private_dot_pi/private_agent/auth.json` (may become unnecessary)

## Reusable code patterns

- **beforeProviderRequest hook**: Extension docs show model-ID rewriting example (custom-provider.md)
- **registerProvider**: Pi API for dynamic provider registration with custom streaming handlers
- **chezmoi templating**: Already use .environment for home/work branching (opencode.jsonc.tmpl)
- **API types**: anthropic-messages, openai-completions, google-generative-ai are the native APIs

## Implementation steps

- [ ] [DONE:0/7] **Phase 1: Create provider profile template**
  - [ ] Analyze OpenRouter's upstream model ID format (e.g., does it accept `anthropic/claude-sonnet-4.6` or expect different IDs?)
  - [ ] Draft provider-profile.json structure with canonical → upstream mapping
  - [ ] Render for both home and work to validate structure

- [ ] [DONE:0/4] **Phase 2: Implement provider-router extension**
  - [ ] Read provider profile on session_start
  - [ ] Register canonical providers with correct API types (anthropic-messages, openai-completions, google-generative-ai)
  - [ ] Implement before_provider_request hook to rewrite model IDs from canonical → upstream
  - [ ] Test that model dropdown shows canonical IDs only

- [ ] [DONE:0/3] **Phase 3: Refactor smart-router**
  - [ ] Update tiers.ts to use canonical provider/model IDs
  - [ ] Verify classifier references canonical models (currently hardcoded to openrouter)
  - [ ] Update index.ts if needed for any provider lookups

- [ ] [DONE:0/2] **Phase 4: Clean up settings**
  - [ ] Remove duplicate model entries from enabledModels array
  - [ ] Update selfLearning model to canonical ID
  - [ ] Remove or simplify any direct OpenRouter references

- [ ] [DONE:0/3] **Phase 5: Validate end-to-end**
  - [ ] Render templates for home and work; compare provider-profile outputs
  - [ ] Verify `/model` shows same canonical list in both environments
  - [ ] Verify smart-router tier selection works with canonical IDs
  - [ ] Verify self-learning model resolves without hardcoded provider names

## Open questions for user

1. **OpenRouter upstream IDs**: Do you know if OpenRouter accepts the full namespaced IDs (`anthropic/claude-sonnet-4.6`) or if it needs bare model IDs? (This affects whether model-ID rewriting is necessary.)

2. **auth.json**: Can we remove it entirely once provider-router handles all registration, or do you need it for login flows?

3. **Environment variable sourcing for home**: Should OPENROUTER_API_KEY come from environment.fish, or should the provider-router extension use `!op read` directly in the provider config?

4. **Model feature parity**: Beyond model ID format, are there API signature differences between OpenRouter and native providers (e.g., reasoning_effort parameter names, system-message roles)? If so, we may need compat flags.
