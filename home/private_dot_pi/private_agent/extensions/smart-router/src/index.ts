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

  function updateStatus(ctx: ExtensionContext) {
    ctx.ui.setStatus(
      "smart-router",
      `route:${routeLock} mode:${routeMode} tier:${activeTier} model:${activeModelLabel}`,
    );
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
        return heuristicClassify(text);
      }
      return llmClassify(text, classifierModel);
    }

    return heuristicClassify(text);
  }

  async function showTierSelector(ctx: ExtensionContext): Promise<void> {
    const selection = await ctx.ui.select("Routing tier", [
      {
        value: "auto",
        label: routeLock === "auto" ? "Auto (current)" : "Auto",
        description: "Classify each prompt automatically",
      },
      {
        value: "fast",
        label: routeLock === "fast" ? "Fast (current)" : "Fast",
        description: "Haiku for reads, search, and quick questions",
      },
      {
        value: "standard",
        label: routeLock === "standard" ? "Standard (current)" : "Standard",
        description: "Sonnet for typical implementation work",
      },
      {
        value: "power",
        label: routeLock === "power" ? "Power (current)" : "Power",
        description: "Opus with high thinking for complex work",
      },
    ]);

    if (!selection || !isRouteLock(selection)) {
      return;
    }

    routeLock = selection;
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

    const tier = await resolveTier(event.text, ctx);
    await applyTier(tier, ctx);
  });
}
