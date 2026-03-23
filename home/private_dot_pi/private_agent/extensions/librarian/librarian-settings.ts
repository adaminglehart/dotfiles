import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import { DEFAULT_MAX_SEARCH_RESULTS, DEFAULT_MAX_TURNS } from "./librarian-core";

type JsonObject = Record<string, unknown>;

export type LibrarianConfig = {
  models: string;
  maxTurns: number;
  maxSearchResults: number;
};

const DEFAULT_CONFIG: LibrarianConfig = {
  models: "",
  maxTurns: DEFAULT_MAX_TURNS,
  maxSearchResults: DEFAULT_MAX_SEARCH_RESULTS,
};

function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge(base: JsonObject, overrides: JsonObject): JsonObject {
  const result: JsonObject = { ...base };
  for (const [key, overrideValue] of Object.entries(overrides)) {
    if (overrideValue === undefined) continue;
    const baseValue = base[key];
    if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
      result[key] = deepMerge(baseValue, overrideValue);
    } else {
      result[key] = overrideValue;
    }
  }
  return result;
}

function loadJsonFile(path: string): JsonObject {
  if (!existsSync(path)) return {};
  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as unknown;
    return isPlainObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function getAgentDir(): string {
  return process.env.PI_CODING_AGENT_DIR || join(homedir(), ".pi", "agent");
}

function globalSettingsPath(): string {
  return join(getAgentDir(), "settings.json");
}

function findAncestorDir(start: string, matches: (dir: string) => boolean): string | undefined {
  let current = start;
  while (true) {
    if (matches(current)) return current;
    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

function resolveProjectBaseDir(cwd: string): string {
  return (
    findAncestorDir(cwd, (dir) => existsSync(join(dir, ".pi", "settings.json"))) ||
    findAncestorDir(cwd, (dir) => existsSync(join(dir, ".git"))) ||
    cwd
  );
}

function projectSettingsPath(cwd: string): string {
  return join(resolveProjectBaseDir(cwd), ".pi", "settings.json");
}

function loadMergedSettings(cwd: string): JsonObject {
  const globalSettings = loadJsonFile(globalSettingsPath());
  const projectSettings = loadJsonFile(projectSettingsPath(cwd));
  return deepMerge(globalSettings, projectSettings);
}

function getSetting<T>(settings: JsonObject, path: string, fallback: T): T {
  const parts = path.split(".").filter(Boolean);
  let current: unknown = settings;
  for (const part of parts) {
    if (!isPlainObject(current)) return fallback;
    current = current[part];
  }
  return (current as T) ?? fallback;
}

/**
 * Load librarian configuration from settings.json (global + project merged),
 * falling back to env vars, then defaults.
 *
 * Resolution order per field:
 *   settings.json "librarian.{field}" > env var > default
 *
 * Settings example in ~/.pi/agent/settings.json:
 * ```json
 * {
 *   "librarian": {
 *     "models": "anthropic/claude-sonnet-4-5:high,openai/gpt-5.4:medium",
 *     "maxTurns": 12,
 *     "maxSearchResults": 50
 *   }
 * }
 * ```
 */
export function loadLibrarianConfig(cwd: string): LibrarianConfig {
  const settings = loadMergedSettings(cwd);
  const section = getSetting<JsonObject>(settings, "librarian", {});

  const models =
    (typeof section.models === "string" && section.models.trim()) ||
    process.env.PI_LIBRARIAN_MODELS?.trim() ||
    DEFAULT_CONFIG.models;

  const maxTurnsRaw = section.maxTurns ?? process.env.PI_LIBRARIAN_MAX_TURNS;
  const maxTurns = parsePositiveInt(maxTurnsRaw, DEFAULT_CONFIG.maxTurns);

  const maxSearchResultsRaw = section.maxSearchResults ?? process.env.PI_LIBRARIAN_MAX_SEARCH_RESULTS;
  const maxSearchResults = parsePositiveInt(maxSearchResultsRaw, DEFAULT_CONFIG.maxSearchResults);

  return { models, maxTurns, maxSearchResults };
}

function parsePositiveInt(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}
