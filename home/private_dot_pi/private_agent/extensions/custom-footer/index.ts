/**
 * Custom Footer - Shows model info, costs, and status in a powerline-style footer
 *
 * Displays:
 * - Model info (Line 1 & 2)
 * - Dynamic height Status Box (right)
 * - Dynamic Aquarium (Bottom rows)
 *
 * Usage: pi -e ./custom-footer/index.ts
 */

import type { ExtensionAPI, ExtensionContext, ReadonlyFooterDataProvider, SessionMessageEntry, Theme } from "@mariozechner/pi-coding-agent";
import type { Api, Model } from "@mariozechner/pi-ai";
import { truncateToWidth, visibleWidth, type TUI } from "@mariozechner/pi-tui";
import {
	renderAnimationBlock,
	renderAquarium,
	startAnimation,
	stopAnimation,
	cycleAnimation,
	addManualFish,
	CONFIG,
} from "./animation.js";

// ═══════════════════════════════════════════════════════════════════════════
// Color helpers
// ═══════════════════════════════════════════════════════════════════════════

export const ansi = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	dim: "\x1b[2m",
	fg: (color: string) => `\x1b[38;5;${color}m`,
};

export const colors = {
	pi: "213", // Pink
	model: "183", // Light purple
	input: "111", // Light blue
	output: "158", // Light green
	cost: "222", // Light yellow
	thinking: "183", // Light purple
	sep: "240", // Gray
	text: "250", // Light gray
	accent: "213", // Pink
};

// ═══════════════════════════════════════════════════════════════════════════
// Formatting helpers
// ═══════════════════════════════════════════════════════════════════════════

function formatCost(cost: number): string {
	if (cost === 0) return "free";
	if (cost < 0.01) return `${(cost * 100).toFixed(2)}¢`;
	return `$${cost.toFixed(2)}`;
}

function formatTokens(n: number): string {
	if (n < 1000) return n.toString();
	if (n < 1000000) {
		if (n < 10000) return `${(n / 1000).toFixed(1)}k`;
		return `${Math.round(n / 1000)}k`;
	}
	if (n < 10000000) return `${(n / 1000000).toFixed(1)}M`;
	return `${Math.round(n / 1000000)}M`;
}

function getThinkingEmoji(level: string): string {
	switch (level) {
		case "off": return "○";
		case "minimal": return "◐";
		case "low": return "◑";
		case "medium": return "◒";
		case "high": return "◓";
		case "xhigh": return "●";
		default: return "○";
	}
}

function getThinkingLabel(level: string): string {
	switch (level) {
		case "off": return "off";
		case "minimal": return "min";
		case "low": return "low";
		case "medium": return "med";
		case "high": return "high";
		case "xhigh": return "max";
		default: return level;
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// Segment renderers
// ═══════════════════════════════════════════════════════════════════════════

interface FooterContext {
	model: Model<Api> | null;
	thinkingLevel: string;
	usageCost: number;
	contextTokens: number | null;
	contextPercent: number | null;
	contextWindow: number;
	cwd: string;
	gitBranch: string | null;
	acmEnabled: boolean;
}

function renderAcmSegment(ctx: FooterContext): string {
	if (ctx.acmEnabled) {
		return `${ansi.fg(colors.pi)}ACM${ansi.reset}`;
	} else {
		return `${ansi.fg(colors.sep)}ACM:${ansi.reset}${ansi.fg(colors.text)}off${ansi.reset}`;
	}
}

function renderModelSegment(ctx: FooterContext): string {
	if (!ctx.model) return "";
	const modelName = ctx.model.name || ctx.model.id;
	let shortName = modelName.trim();
	if (shortName.startsWith("Claude ")) shortName = shortName.slice(7);
	if (shortName.startsWith("Google: ")) shortName = shortName.slice(8);
	if (shortName.startsWith("MoonshotAI: ")) shortName = shortName.slice(11);
	if (shortName.startsWith("Anthropic: ")) shortName = shortName.slice(10);
	if (shortName.startsWith("OpenAI: ")) shortName = shortName.slice(8);
	if (shortName.length > 30) shortName = shortName.slice(0, 30) + "…";
	return `${ansi.fg(colors.model)}${shortName}${ansi.reset}`;
}

function renderPricingSegment(ctx: FooterContext): string {
	if (!ctx.model) return "";
	const { cost } = ctx.model;
	const inPrice = formatCost(cost.input);
	const outPrice = formatCost(cost.output);
	const inColor = ansi.fg(colors.input);
	const outColor = ansi.fg(colors.output);
	const sepColor = ansi.fg(colors.sep);
	return `${inColor}▲${inPrice}${ansi.reset}${sepColor}/${ansi.reset}${outColor}▼${outPrice}${ansi.reset}`;
}

function renderThinkingSegment(ctx: FooterContext): string {
	const level = ctx.thinkingLevel || "off";
	const emoji = getThinkingEmoji(level);
	const label = getThinkingLabel(level);
	return `${ansi.fg(colors.thinking)}${emoji}${ansi.reset} ${ansi.fg(colors.text)}${label}${ansi.reset}`;
}

function renderDirectorySegment(ctx: FooterContext): string {
	if (!ctx.cwd) return "";
	const color = ansi.fg(colors.text);
	let displayPath = ctx.cwd;
	const home = "/Users/adaminglehart";
	if (displayPath.startsWith(home)) displayPath = "~" + displayPath.slice(home.length);
	return `${color}${displayPath}${ansi.reset}`;
}

function renderBranchSegment(ctx: FooterContext): string {
	if (!ctx.gitBranch) return "";
	const branch = ctx.gitBranch === "detached" ? "◆" : ctx.gitBranch;
	return `${ansi.fg(colors.text)}${ansi.reset}${ansi.fg(colors.model)}${branch}${ansi.reset}`;
}

function renderTokensSegment(ctx: FooterContext): string {
	if (ctx.contextWindow <= 0) return "";
	const inColor = ansi.fg(colors.input);
	const textColor = ansi.fg(colors.text);
	const dimColor = ansi.fg(colors.sep);
	let display = ctx.contextPercent !== null ? `${Math.round(ctx.contextPercent * 10) / 10}%` : `${dimColor}?${ansi.reset}${inColor}`;
	display += `/${formatTokens(ctx.contextWindow)}`;
	return `${textColor}ctx:${ansi.reset} ${inColor}${display}${ansi.reset}`;
}

function renderSessionCostSegment(ctx: FooterContext): string {
	return `${ansi.fg(colors.text)}cost:${ansi.reset} ${ansi.fg(colors.cost)}$${ctx.usageCost.toFixed(3)}${ansi.reset}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Main footer builder
// ═══════════════════════════════════════════════════════════════════════════

function buildFooter(ctx: FooterContext, width: number): string[] {
	const separator = ` ${ansi.fg(colors.sep)}│${ansi.reset} `;

	// Get animation block based on total height
	// Total height = 2 info lines + config aquarium rows
	const totalHeight = 2 + CONFIG.AQUARIUM_ROWS;
	const animLines = renderAnimationBlock(totalHeight);
	
	const animWidth = CONFIG.BOX_WIDTH;
	const mainWidth = width - animWidth - 2;

	// Line 1 Content: directory and branch
	const line1Segments: string[] = [];
	const dirSeg = renderDirectorySegment(ctx);
	const branchSeg = renderBranchSegment(ctx);
	if (dirSeg) line1Segments.push(dirSeg);
	if (branchSeg) line1Segments.push(branchSeg);
	const line1Content = line1Segments.join(separator);

	// Line 2 Content: model, pricing, cost
	const line2Segments: string[] = [];
	const modelSeg = renderModelSegment(ctx);
	const tokensSeg = renderTokensSegment(ctx);
	const costSeg = renderSessionCostSegment(ctx);
	if (modelSeg) line2Segments.push(modelSeg);
	if (tokensSeg) line2Segments.push(tokensSeg);
	if (costSeg) line2Segments.push(costSeg);
	const line2Content = line2Segments.join(separator);

	// Aquarium: rows 1 to CONFIG.AQUARIUM_ROWS
	const aquariumLines = renderAquarium(mainWidth, ctx.contextPercent || 0);

	// Padding
	const line1Pad = Math.max(0, mainWidth - visibleWidth(line1Content));
	const line2Pad = Math.max(0, mainWidth - visibleWidth(line2Content));

	// Build the final array of lines
	const resultLines: string[] = [];

	// Combine Line 1
	resultLines.push(truncateToWidth(line1Content + " ".repeat(line1Pad) + "  " + animLines[0], width));
	
	// Combine Line 2
	resultLines.push(truncateToWidth(line2Content + " ".repeat(line2Pad) + "  " + animLines[1], width));

	// Combine Aquarium rows with the rest of the status box
	for (let i = 0; i < aquariumLines.length; i++) {
		// Use aquarium line + remaining box lines
		const boxLine = animLines[i + 2] || "";
		resultLines.push(truncateToWidth((aquariumLines[i] || " ".repeat(mainWidth)) + "  " + boxLine, width));
	}

	return resultLines;
}

// ═══════════════════════════════════════════════════════════════════════════
// Extension
// ═══════════════════════════════════════════════════════════════════════════

export default function customFooter(pi: ExtensionAPI) {
	let enabled = true;
	let tuiRef: TUI | null = null;
	let ctxRef: ExtensionContext | null = null;
	let acmEnabled = false;

	pi.events.on("context-pilot:enabled", () => {
		acmEnabled = true;
		tuiRef?.requestRender();
	});

	pi.on("agent_end", async () => { tuiRef?.requestRender(); });
	pi.on("model_select", async () => { tuiRef?.requestRender(); });
	pi.on("agent_start", async () => { tuiRef?.requestRender(); });

	pi.on("session_switch", async () => {
		acmEnabled = false;
		pi.events.emit("context-pilot:status_request", {});
		tuiRef?.requestRender();
	});

	pi.registerCommand("footer-cycle", {
		description: "Cycle footer animation style",
		handler: async (_args, ctx) => {
			const style = cycleAnimation();
			ctx.ui.notify(`Style: ${style}`, "info");
			tuiRef?.requestRender();
		},
	});

	pi.registerCommand("fish", {
		description: "Add a new fish manually",
		handler: async (_args, ctx) => {
			addManualFish();
			ctx.ui.notify("Added a new fish! 🐠", "info");
			tuiRef?.requestRender();
		},
	});

	pi.registerCommand("footer", {
		description: "Toggle custom footer",
		handler: async (_args, ctx) => {
			enabled = !enabled;
			if (enabled) {
				setupFooter(ctx);
				ctx.ui.notify("Footer enabled", "info");
			} else {
				stopAnimation();
				ctx.ui.setFooter(undefined);
				ctx.ui.notify("Footer disabled", "info");
			}
		},
	});

	function calculateSessionCost(ctx: ExtensionContext): number {
		let total = 0;
		try {
			for (const entry of ctx.sessionManager.getEntries()) {
				if (entry.type === "message" && (entry as SessionMessageEntry).message?.usage?.cost?.total) total += (entry as SessionMessageEntry).message.usage.cost.total;
			}
		} catch {}
		return total;
	}

	function setupFooter(ctx: ExtensionContext) {
		if (!ctx.hasUI) return;
		ctxRef = ctx;
		ctx.ui.setFooter((tui: TUI, theme: Theme, footerData: ReadonlyFooterDataProvider) => {
			tuiRef = tui;
			return {
				render: (width: number): string[] => {
					const contextUsage = ctxRef?.getContextUsage?.();
					const footerContext: FooterContext = {
						model: ctxRef?.model ?? null,
						thinkingLevel: pi.getThinkingLevel(),
						usageCost: ctxRef ? calculateSessionCost(ctxRef) : 0,
						contextTokens: contextUsage?.tokens ?? null,
						contextPercent: contextUsage?.percent ?? null,
						contextWindow: contextUsage?.contextWindow ?? 0,
						cwd: ctxRef?.cwd ?? "",
						gitBranch: footerData?.getGitBranch?.() ?? null,
						acmEnabled: acmEnabled,
					};
					return buildFooter(footerContext, width);
				},
				invalidate: () => {},
				dispose: () => { stopAnimation(); },
			};
		});
		startAnimation(tuiRef);
	}

	pi.on("session_start", async (_event, ctx) => {
		pi.events.emit("context-pilot:status_request", {});
		if (enabled && ctx.hasUI) setupFooter(ctx);
	});
}
