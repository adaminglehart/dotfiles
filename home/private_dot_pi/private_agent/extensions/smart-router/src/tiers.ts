export const ROUTE_TIERS = ["fast", "standard", "power"] as const;
export const ROUTE_MODES = ["heuristic", "llm"] as const;
export const ROUTE_LOCKS = ["auto", ...ROUTE_TIERS] as const;

export type RouteTier = (typeof ROUTE_TIERS)[number];
export type RouteMode = (typeof ROUTE_MODES)[number];
export type RouteLock = (typeof ROUTE_LOCKS)[number];
export type RouterThinkingLevel =
  | "off"
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh";

export interface TierDefinition {
  provider: string;
  modelId: string;
  thinking: RouterThinkingLevel;
  label: string;
  fullModelId: string;
}

const TIER_DEFINITIONS: Record<RouteTier, TierDefinition> = {
  fast: {
    provider: "anthropic",
    modelId: "claude-haiku-4-5",
    thinking: "off",
    label: "Fast",
    fullModelId: "anthropic/claude-haiku-4-5",
  },
  standard: {
    provider: "anthropic",
    modelId: "claude-sonnet-4-6",
    thinking: "off",
    label: "Standard",
    fullModelId: "anthropic/claude-sonnet-4-6",
  },
  power: {
    provider: "openai-codex",
    modelId: "gpt-5.4",
    thinking: "high",
    label: "Power",
    fullModelId: "openai-codex/gpt-5.4",
  },
};

export function getTierDefinition(tier: RouteTier): TierDefinition {
  return TIER_DEFINITIONS[tier];
}

export function isRouteTier(value: string): value is RouteTier {
  return ROUTE_TIERS.some((tier) => tier === value);
}

export function isRouteMode(value: string): value is RouteMode {
  return ROUTE_MODES.some((mode) => mode === value);
}

export function isRouteLock(value: string): value is RouteLock {
  return ROUTE_LOCKS.some((lock) => lock === value);
}
