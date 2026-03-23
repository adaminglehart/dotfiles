import type { ExtensionContext } from "@mariozechner/pi-coding-agent";

import { shorten, type LibrarianRunDetails, type SubagentSelectionInfo } from "./librarian-core";

export const VALID_THINKING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh"] as const;
export type ThinkingLevel = (typeof VALID_THINKING_LEVELS)[number];

const QUOTA_UNAVAILABLE_TTL_MS = 30 * 60 * 1000;
const ERROR_UNAVAILABLE_TTL_MS = 10 * 60 * 1000;

export type SubagentModel = NonNullable<ExtensionContext["model"]>;
export type UnavailableReason = "quota" | "error";

export type ModelSelection = {
  model: SubagentModel;
  thinkingLevel?: ThinkingLevel;
} & SubagentSelectionInfo;

export type AttemptFailure = {
  modelLabel: string;
  reason: UnavailableReason;
  message: string;
};

type ModelOverrideEntry = {
  provider: string;
  modelId: string;
  thinkingLevel: ThinkingLevel;
  tokenIndex: number;
};

export type SelectionPlan = {
  overrides: ModelOverrideEntry[];
  nextOverrideIndex: number;
  fallbackModel: SubagentModel | undefined;
  fallbackConsumed: boolean;
  envConfigured: boolean;
};

const temporarilyUnavailable = new Map<string, { untilMs: number; reason: UnavailableReason }>();

function modelKey(provider: string, modelId: string): string {
  return `${provider.trim().toLowerCase()}/${modelId.trim().toLowerCase()}`;
}

function getUnavailableState(provider: string, modelId: string) {
  const key = modelKey(provider, modelId);
  const state = temporarilyUnavailable.get(key);
  if (!state) return undefined;
  if (state.untilMs > Date.now()) return state;
  temporarilyUnavailable.delete(key);
  return undefined;
}

export function markTemporarilyUnavailable(model: SubagentModel, reason: UnavailableReason): void {
  const ttlMs = reason === "quota" ? QUOTA_UNAVAILABLE_TTL_MS : ERROR_UNAVAILABLE_TTL_MS;
  temporarilyUnavailable.set(modelKey(model.provider, model.id), {
    reason,
    untilMs: Date.now() + ttlMs,
  });
}

function parseModelToken(
  raw: string,
  tokenIndex: number,
): { value: { provider: string; modelId: string; thinkingLevel: ThinkingLevel } } | { error: string } {
  const value = raw.trim();
  if (!value) {
    return { error: `Empty token #${tokenIndex} in librarian models config.` };
  }

  const slashIndex = value.indexOf("/");
  if (slashIndex <= 0 || slashIndex === value.length - 1) {
    return {
      error: `Invalid token #${tokenIndex} "${raw}". Expected "provider/model:thinking" where thinking is one of: ${VALID_THINKING_LEVELS.join(", ")}.`,
    };
  }

  const provider = value.slice(0, slashIndex).trim();
  const modelWithThinking = value.slice(slashIndex + 1).trim();
  const colonIndex = modelWithThinking.lastIndexOf(":");

  if (colonIndex <= 0 || colonIndex === modelWithThinking.length - 1) {
    return {
      error: `Invalid token #${tokenIndex} "${raw}". Expected "provider/model:thinking" where thinking is one of: ${VALID_THINKING_LEVELS.join(", ")}.`,
    };
  }

  const modelId = modelWithThinking.slice(0, colonIndex).trim();
  const thinking = modelWithThinking.slice(colonIndex + 1).trim().toLowerCase();

  if (!provider || !modelId) {
    return { error: `Invalid token #${tokenIndex} "${raw}". Provider and model must be non-empty.` };
  }

  if (!VALID_THINKING_LEVELS.includes(thinking as ThinkingLevel)) {
    return {
      error: `Invalid thinking level "${thinking}" in token #${tokenIndex} "${raw}". Valid: ${VALID_THINKING_LEVELS.join(", ")}.`,
    };
  }

  return { value: { provider, modelId, thinkingLevel: thinking as ThinkingLevel } };
}

function parseModelOverrides(modelsString: string): { value: ModelOverrideEntry[]; configured: boolean } | { error: string } {
  if (!modelsString.trim()) return { value: [], configured: false };

  const entries: ModelOverrideEntry[] = [];
  const tokens = modelsString.split(",");

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].trim();
    if (!token) continue;

    const parsed = parseModelToken(token, i + 1);
    if ("error" in parsed) return { error: parsed.error };

    entries.push({
      tokenIndex: i + 1,
      provider: parsed.value.provider,
      modelId: parsed.value.modelId,
      thinkingLevel: parsed.value.thinkingLevel,
    });
  }

  return { value: entries, configured: true };
}

function matchAvailable(
  available: SubagentModel[],
  provider: string,
  modelId: string,
): SubagentModel | undefined {
  const pNorm = provider.toLowerCase();
  const mNorm = modelId.toLowerCase();
  return available.find((c) => c.provider.toLowerCase() === pNorm && c.id.toLowerCase() === mNorm);
}

export function createSelectionPlan(
  modelsConfig: string,
  currentModel: ExtensionContext["model"],
): { plan: SelectionPlan } | { error: string } {
  const parsed = parseModelOverrides(modelsConfig);
  if ("error" in parsed) return { error: parsed.error };

  return {
    plan: {
      overrides: parsed.value,
      nextOverrideIndex: 0,
      fallbackModel: currentModel ?? undefined,
      fallbackConsumed: false,
      envConfigured: parsed.configured,
    },
  };
}

export function getNextModel(
  plan: SelectionPlan,
  modelRegistry: ExtensionContext["modelRegistry"],
): ModelSelection | null {
  const available = modelRegistry.getAvailable() as SubagentModel[];

  while (plan.nextOverrideIndex < plan.overrides.length) {
    const entry = plan.overrides[plan.nextOverrideIndex++];
    const matched = matchAvailable(available, entry.provider, entry.modelId);
    if (!matched) continue;
    if (getUnavailableState(matched.provider, matched.id)) continue;

    return {
      model: matched,
      thinkingLevel: entry.thinkingLevel,
      reason: `config token #${entry.tokenIndex}: ${matched.provider}/${matched.id}:${entry.thinkingLevel}`,
    };
  }

  if (plan.fallbackConsumed) return null;
  plan.fallbackConsumed = true;

  if (!plan.fallbackModel) return null;

  const fallback = matchAvailable(available, plan.fallbackModel.provider, plan.fallbackModel.id);
  if (!fallback) return null;
  if (getUnavailableState(fallback.provider, fallback.id)) return null;

  const source = plan.envConfigured
    ? "ctx.model fallback after configured models"
    : "ctx.model (no models configured)";

  return {
    model: fallback,
    reason: `${source}: ${fallback.provider}/${fallback.id}`,
  };
}

export function buildNoCandidateError(plan: SelectionPlan): string {
  if (!plan.fallbackModel && plan.envConfigured) {
    return "No model candidates available after filtering, and ctx.model is undefined. Configure at least one available model.";
  }
  if (!plan.fallbackModel) {
    return "No models available: no models configured and ctx.model is undefined.";
  }
  return "No model candidates available after filtering. ctx.model fallback was unavailable or temporarily unavailable.";
}

export function formatModelLabel(selection: ModelSelection): string {
  const base = `${selection.model.provider}/${selection.model.id}`;
  return selection.thinkingLevel ? `${base}:${selection.thinkingLevel}` : base;
}

export function formatFinalFailureMessage(failures: AttemptFailure[]): string {
  if (failures.length === 0) return "Librarian failed: no model attempts were executed.";
  const summary = failures
    .map((f, i) => `${i + 1}) ${f.modelLabel} [${f.reason}] ${shorten(f.message, 120)}`)
    .join("; ");
  return `Librarian failed after ${failures.length} attempt${failures.length === 1 ? "" : "s"}: ${summary}`;
}

export function isQuotaError(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    msg.includes("rate limit") ||
    msg.includes("rate_limit") ||
    msg.includes("quota") ||
    msg.includes("429") ||
    msg.includes("insufficient_quota") ||
    msg.includes("exceeded your current quota") ||
    msg.includes("out of credits") ||
    msg.includes("billing")
  );
}

export function looksLikeSilentFailure(r: LibrarianRunDetails): boolean {
  return r.status === "done" && r.toolCalls.length === 0 && (!r.summaryText || r.summaryText === "(no output)");
}

export function isAbortLikeError(error: unknown): boolean {
  if (error && typeof error === "object" && "name" in error && (error as { name: string }).name === "AbortError") {
    return true;
  }
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return msg.includes("aborted") || msg.includes("cancelled") || msg.includes("canceled");
}
