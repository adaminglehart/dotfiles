import type {
  ExtensionAPI,
  ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import {
  heuristicClassify,
  llmClassify,
  CLASSIFIER_PROVIDER,
  CLASSIFIER_MODEL_ID,
} from "./classifier";
import {
  getTierDefinition,
  isRouteLock,
  isRouteMode,
  type RouteLock,
  type RouteMode,
  type RouteTier,
} from "./tiers";

export default function smartRouter(pi: ExtensionAPI) {
  let routeLock: RouteLock = "auto";
  let routeMode: RouteMode = "llm";
  let activeTier: RouteTier = "standard";
  let activeModelLabel = getTierDefinition(activeTier).fullModelId;

  function updateStatus(ctx: ExtensionContext, classifying = false) {
    const label = classifying
      ? `route:${routeLock} mode:${routeMode} tier:… model:…`
      : `route:${routeLock} mode:${routeMode} tier:${activeTier} model:${activeModelLabel}`;
    ctx.ui.setStatus("smart-router", label);
  }

  async function applyTier(
    tier: RouteTier,
    ctx: ExtensionContext,
    notifyOnFailure = false,
  ): Promise<void> {
    const definition = getTierDefinition(tier);
    const model = ctx.modelRegistry.find(
      definition.provider,
      definition.modelId,
    );

    activeTier = tier;
    activeModelLabel = definition.fullModelId;

    if (!model) {
      activeModelLabel = `${definition.fullModelId} (missing)`;
      if (notifyOnFailure) {
        ctx.ui.notify(`Model not found: ${definition.fullModelId}`, "warning");
      }
      updateStatus(ctx);
      return;
    }

    const changed = await pi.setModel(model);
    if (!changed) {
      activeModelLabel = `${definition.fullModelId} (auth missing)`;
      if (notifyOnFailure) {
        ctx.ui.notify(
          `No API key available for ${definition.fullModelId}`,
          "warning",
        );
      }
      updateStatus(ctx);
      return;
    }

    pi.setThinkingLevel(definition.thinking);
    updateStatus(ctx);
  }

  async function resolveTier(text: string, ctx: ExtensionContext): Promise<RouteTier> {
    if (routeLock !== "auto") {
      return routeLock;
    }

    if (routeMode === "llm") {
      const classifierModel = ctx.modelRegistry.find(CLASSIFIER_PROVIDER, CLASSIFIER_MODEL_ID);
      if (!classifierModel) {
        ctx.ui.notify(`Smart-router: classifier model ${CLASSIFIER_PROVIDER}/${CLASSIFIER_MODEL_ID} not found, falling back to heuristic`, "warning");
        return heuristicClassify(text);
      }
      try {
        return await llmClassify(text, classifierModel);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        ctx.ui.notify(`Smart-router: LLM classify failed (${msg}), falling back to heuristic`, "warning");
        return heuristicClassify(text);
      }
    }

    return heuristicClassify(text);
  }

  async function showTierSelector(ctx: ExtensionContext): Promise<void> {
    const options = [
      `auto${routeLock === "auto" ? " (current)" : ""} — classify each prompt automatically`,
      `fast${routeLock === "fast" ? " (current)" : ""} — Haiku for reads, search, quick questions`,
      `standard${routeLock === "standard" ? " (current)" : ""} — Sonnet for typical implementation work`,
      `power${routeLock === "power" ? " (current)" : ""} — Opus with high thinking for complex work`,
    ];

    const selection = await ctx.ui.select("Routing tier", options);

    if (!selection) {
      return;
    }

    // Extract the tier keyword from the start of the selected string
    const value = selection.split(" ")[0];
    if (!isRouteLock(value)) {
      return;
    }

    routeLock = value;
    if (routeLock === "auto") {
      ctx.ui.notify(`Routing returned to auto (${routeMode})`, "info");
      updateStatus(ctx);
      return;
    }

    await applyTier(routeLock, ctx, true);
    ctx.ui.notify(`Routing locked to ${routeLock}`, "info");
  }

  pi.registerCommand("route", {
    description: "Lock routing to auto, fast, standard, or power",
    handler: async (args, ctx) => {
      const value = (args ?? "").trim().toLowerCase();
      if (!value) {
        ctx.ui.notify(`Current routing: ${routeLock} (${routeMode})`, "info");
        updateStatus(ctx);
        return;
      }

      if (!isRouteLock(value)) {
        ctx.ui.notify("Usage: /route <auto|fast|standard|power>", "error");
        return;
      }

      routeLock = value;
      if (routeLock === "auto") {
        ctx.ui.notify(`Routing returned to auto (${routeMode})`, "info");
        updateStatus(ctx);
        return;
      }

      await applyTier(routeLock, ctx, true);
      ctx.ui.notify(`Routing locked to ${routeLock}`, "info");
    },
  });

  pi.registerCommand("route-mode", {
    description: "Switch routing mode between heuristic and llm",
    handler: async (args, ctx) => {
      const value = (args ?? "").trim().toLowerCase();
      if (!value) {
        ctx.ui.notify(`Current routing mode: ${routeMode}`, "info");
        updateStatus(ctx);
        return;
      }

      if (!isRouteMode(value)) {
        ctx.ui.notify("Usage: /route-mode <heuristic|llm>", "error");
        return;
      }

      routeMode = value;
      ctx.ui.notify(`Routing mode set to ${routeMode}`, "info");
      updateStatus(ctx);
    },
  });

  pi.registerShortcut("ctrl+shift+r", {
    description: "Select routing tier",
    handler: async (ctx) => {
      await showTierSelector(ctx);
    },
  });

  pi.on("session_start", async (_event, ctx) => {
    updateStatus(ctx);
  });

  pi.on("model_select", async (event, ctx) => {
    activeModelLabel = `${event.model.provider}/${event.model.id}`;
    updateStatus(ctx);
  });

  pi.on("input", async (event, ctx) => {
    if (event.source === "extension") {
      return;
    }

    updateStatus(ctx, true);
    const tier = await resolveTier(event.text, ctx);
    await applyTier(tier, ctx);
  });
}
