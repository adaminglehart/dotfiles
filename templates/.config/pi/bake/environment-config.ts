export const DEFAULT_MODEL = "{{ "stripe-anthropic/claude-sonnet-4.5" if mise_env is defined and "work" in mise_env else "anthropic/claude-sonnet-4.6" }}";
