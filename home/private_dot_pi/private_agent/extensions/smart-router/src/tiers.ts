import { TIER_DEFINITIONS } from "./environment-config";

export const ROUTE_TIERS = ["fast", "standard", "power"] as const;
export const ROUTE_MODES = ["off", "heuristic", "llm"] as const;
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
