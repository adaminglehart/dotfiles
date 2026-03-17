import { completeSimple } from "@mariozechner/pi-ai";
import { ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { Api, Model } from "@mariozechner/pi-ai";
import type { RouteTier } from "./tiers";
import { CLASSIFIER_MODEL_ID, CLASSIFIER_PROVIDER } from "./environment-config";

const FAST_PATTERNS = [
  /\b(show|list|find|grep|cat|read|search)\b/i,
  /\b(ls|pwd|which|where)\b/i,
  /^\s*what\s+is\b/i,
  /^\s*how\s+many\b/i,
];

const POWER_PATTERNS = [
  /\b(architect|refactor|redesign|debug|plan|migrate|design|complex|rethink)\b/i,
  /\bwhy\s+is\b.*\b(not\s+working|broken|failing)\b/i,
];

const CLASSIFIER_PROMPT = [
  "Classify each user request for a coding agent.",
  "Respond with exactly one word: fast, standard, or power.",
  "fast = reads, listing, searching, simple questions, tiny edits.",
  "standard = normal implementation, tests, moderate refactors, bug fixes.",
  "power = planning, architecture, complex debugging, redesigns, large refactors.",
].join("\n");

export { CLASSIFIER_MODEL_ID, CLASSIFIER_PROVIDER };

export function heuristicClassify(text: string): RouteTier {
  if (POWER_PATTERNS.some((pattern) => pattern.test(text))) {
    return "power";
  }

  if (FAST_PATTERNS.some((pattern) => pattern.test(text))) {
    return "fast";
  }

  return "standard";
}

export async function llmClassify(
  text: string,
  model: Model<Api>,
  apiKey: string,
  ctx: ExtensionContext,
): Promise<RouteTier | null> {
  const result = await completeSimple(
    model,
    {
      systemPrompt: CLASSIFIER_PROMPT,
      messages: [
        {
          role: "user",
          content: text,
          timestamp: Date.now(),
        },
      ],
    },
    {
      temperature: 0,
      maxTokens: 64,
      apiKey,
    },
  );

  if (result.errorMessage) {
    ctx.ui.notify(
      `Smart-router: LLM classify failed (${result.errorMessage}), falling back to heuristic`,
      "warning",
    );
    return null;
  }

  const response = result.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join(" ")
    .trim()
    .toLowerCase();

  ctx.ui.notify(`Smart-router: LLM response (response: ${response}) `, "info");

  const match = response.match(/\b(fast|standard|power)\b/);
  if (!match) {
    ctx.ui.notify(
      `Smart-router: LLM classify failed (no match), falling back to heuristic (response: ${response}) `,
      "warning",
    );
    return null;
  }

  return match[1] as RouteTier;
}
