# and FNOX_AGE_KEY not already set
if test (which op)
  if test (which fnox) && test -z "$FNOX_AGE_KEY"
    set -g FNOX_AGE_KEY (op_cached "op://homelab/age key/secretkey")
  end

  set -g ANTHROPIC_API_KEY (op_cached "op://dotenv/ANTHROPIC_API_KEY/value")
  set -g GEMINI_API_KEY (op_cached "op://dotenv/GEMINI_API_KEY/value")
  set -g OPENAI_API_KEY (op_cached "op://dotenv/OPENAI_API_KEY/value")
end

# if test (which op)
#     set -gx HONCHO_API_KEY (op_cached "op://dotenv/HONCHO_API_KEY/value")
# end
