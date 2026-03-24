/**
 * Custom Footer - Shows model info, costs, and status in a powerline-style footer
 *
 * Displays:
 * - Model name with provider
 * - Token pricing (input/output per 1M tokens)
 * - Current thinking level
 * - Session cost (if tracked)
 * - Git branch and directory
 * - Context usage
 * - 5x3 Animated ASCII block on the right
 *
 * Usage: pi -e ./custom-footer/index.ts
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { Model } from "@mariozechner/pi-ai";
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import {
	cycleAnimation,
	renderAnimationBlock,
	startAnimation,
	stopAnimation,
} from "./animation.js";

// ═══════════════════════════════════════════════════════════════════════════
// Color helpers (exported for animation.ts)
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
	reset: "0",
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
		case "off":
			return "○";
		case "minimal":
			return "◐";
		case "low":
			return "◑";
		case "medium":
			return "◒";
		case "high":
			return "◓";
		case "xhigh":
			return "●";
		default:
			return "○";
	}
}

function getThinkingLabel(level: string): string {
	switch (level) {
		case "off":
			return "off";
		case "minimal":
			return "min";
		case "low":
			return "low";
		case "medium":
			return "med";
		case "high":
			return "high";
		case "xhigh":
			return "max";
		default:
			return level;
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// Segment renderers
// ═══════════════════════════════════════════════════════════════════════════

interface FooterContext {
	model: Model<any> | null;
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
		const color = ansi.fg(colors.pi);
		return `${color}ACM${ansi.reset}`;
	} else {
		const color = ansi.fg(colors.sep);
		const textColor = ansi.fg(colors.text);
		return `${color}ACM:${ansi.reset}${textColor}off${ansi.reset}`;
	}
}

function renderModelSegment(ctx: FooterContext): string {
	if (!ctx.model) return "";

	const modelName = ctx.model.name || ctx.model.id;

	// Shorten model name
	let shortName = modelName.trim();
	if (shortName.startsWith("Claude ")) shortName = shortName.slice(7);
	if (shortName.startsWith("Google: ")) shortName = shortName.slice(8);
	if (shortName.startsWith("MoonshotAI: ")) shortName = shortName.slice(11);
	if (shortName.startsWith("Anthropic: ")) shortName = shortName.slice(10);
	if (shortName.startsWith("OpenAI: ")) shortName = shortName.slice(8);
	if (shortName.length > 30) shortName = shortName.slice(0, 30) + "…";

	const color = ansi.fg(colors.model);
	return `${color}${shortName}${ansi.reset}`;
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

	const color = ansi.fg(colors.thinking);
	const textColor = ansi.fg(colors.text);

	return `${color}${emoji}${ansi.reset} ${textColor}${label}${ansi.reset}`;
}

function renderDirectorySegment(ctx: FooterContext): string {
	if (!ctx.cwd) return "";

	const color = ansi.fg(colors.text);
	const home = "/Users/adaminglehart";
	let displayPath = ctx.cwd;
	if (displayPath.startsWith(home)) {
		displayPath = "~" + displayPath.slice(home.length);
	}

	return `${color}${displayPath}${ansi.reset}`;
}

function renderBranchSegment(ctx: FooterContext): string {
	if (!ctx.gitBranch) return "";

	const color = ansi.fg(colors.model);
	const textColor = ansi.fg(colors.text);
	const branch = ctx.gitBranch === "detached" ? "◆" : ctx.gitBranch;

	return `${textColor}${textColor}${ansi.reset}${color}${branch}${ansi.reset}`;
}

function renderTokensSegment(ctx: FooterContext): string {
	if (ctx.contextWindow <= 0) return "";

	const color = ansi.fg(colors.input);
	const textColor = ansi.fg(colors.text);
	const dimColor = ansi.fg(colors.sep);

	let display = "";
	if (ctx.contextPercent !== null) {
		display = `${Math.round(ctx.contextPercent * 10) / 10}%`;
	} else {
		display = `${dimColor}?${ansi.reset}${color}`;
	}
	display += `/${formatTokens(ctx.contextWindow)}`;

	return `${textColor}ctx:${ansi.reset} ${color}${display}${ansi.reset}`;
}

function renderSessionCostSegment(ctx: FooterContext): string {
	const color = ansi.fg(colors.cost);
	const textColor = ansi.fg(colors.text);

	return `${textColor}cost:${ansi.reset} ${color}$${ctx.usageCost.toFixed(3)}${ansi.reset}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Main footer builder
// ═══════════════════════════════════════════════════════════════════════════

function buildFooter(ctx: FooterContext, width: number): string[] {
	const sepColor = ansi.fg(colors.sep);
	const separator = ` ${sepColor}│${ansi.reset} `;

	// Get animation block (3 strings, each 5 characters)
	const animLines = renderAnimationBlock();
	const animWidth = 5; 
	const contentWidth = width - animWidth - 2; // -2 for spacing

	// Line 1 Content: directory and branch
	const line1Segments: string[] = [];
	const dirSeg = renderDirectorySegment(ctx);
	const branchSeg = renderBranchSegment(ctx);
	if (dirSeg) line1Segments.push(dirSeg);
	if (branchSeg) line1Segments.push(branchSeg);
	const line1Content = line1Segments.join(separator);

	// Line 2 Content: model info (left) and metrics (right)
	const line2LeftSegments: string[] = [];
	const modelSeg = renderModelSegment(ctx);
	const pricingSeg = renderPricingSegment(ctx);
	const thinkingSeg = renderThinkingSegment(ctx);
	const acmSeg = renderAcmSegment(ctx);

	if (modelSeg) line2LeftSegments.push(modelSeg);
	if (pricingSeg) line2LeftSegments.push(pricingSeg);
	if (thinkingSeg) line2LeftSegments.push(thinkingSeg);
	if (acmSeg) line2LeftSegments.push(acmSeg);

	const line2RightSegments: string[] = [];
	const tokensSeg = renderTokensSegment(ctx);
	const costSeg = renderSessionCostSegment(ctx);

	if (tokensSeg) line2RightSegments.push(tokensSeg);
	if (costSeg) line2RightSegments.push(costSeg);

	const line2LeftContent = line2LeftSegments.join(separator);
	const line2RightContent = line2RightSegments.join(separator);

	// Padding calculations
	const sepWidth = visibleWidth(separator);
	const line1Pad = Math.max(0, contentWidth - visibleWidth(line1Content));
	const line2Pad = Math.max(
		0,
		contentWidth -
			visibleWidth(line2LeftContent) -
			visibleWidth(line2RightContent) -
			(line2RightSegments.length > 0 ? sepWidth : 0),
	);

	// Combine line parts with animation block on right
	const l1 = truncateToWidth(line1Content + " ".repeat(line1Pad) + "  " + animLines[0], width);

	let l2 = line2LeftContent;
	if (line2RightContent) {
		l2 += " ".repeat(line2Pad) + separator + line2RightContent;
	} else {
		l2 += " ".repeat(line2Pad);
	}
	l2 = truncateToWidth(l2 + "  " + animLines[1], width);

	const l3 = truncateToWidth(" ".repeat(Math.max(0, contentWidth)) + "  " + animLines[2], width);

	return [l1, l2, l3];
}

// ═══════════════════════════════════════════════════════════════════════════
// Extension
// ═══════════════════════════════════════════════════════════════════════════

export default function customFooter(pi: ExtensionAPI) {
	let enabled = true;
	let tuiRef: any = null;
	let ctxRef: any = null;
	let acmEnabled = false;

	// Track context-pilot state
	pi.events.on("context-pilot:enabled", () => {
		acmEnabled = true;
		tuiRef?.requestRender();
	});

	// Request re-render on agent activity
	pi.on("agent_end", async () => {
		tuiRef?.requestRender();
	});

	// Request re-render when model changes
	pi.on("model_select", async () => {
		tuiRef?.requestRender();
	});

	// Request re-render on thinking level changes
	pi.on("agent_start", async () => {
		tuiRef?.requestRender();
	});

	// Request re-render on session switch
	pi.on("session_switch", async () => {
		acmEnabled = false;
		pi.events.emit("context-pilot:status_request", {});
		tuiRef?.requestRender();
	});

	// Register cycle animation command
	pi.registerCommand("footer-cycle", {
		description: "Cycle to next footer animation",
		handler: async (_args, ctx) => {
			const newStyle = cycleAnimation();
			ctx.ui.notify(`Animation: ${newStyle}`, "info");
			tuiRef?.requestRender();
		},
	});

	// Register toggle command
	pi.registerCommand("footer", {
		description: "Toggle custom footer",
		handler: async (_args, ctx) => {
			enabled = !enabled;
			if (enabled) {
				setupFooter(ctx);
				ctx.ui.notify("Custom footer enabled", "info");
			} else {
				stopAnimation();
				ctx.ui.setFooter(undefined);
				ctx.ui.notify("Custom footer disabled", "info");
			}
		},
	});

	function calculateSessionCost(ctx: any): number {
		let totalCost = 0;
		try {
			const entries = ctx.sessionManager.getEntries();
			for (const entry of entries) {
				if (entry.type === "message" && (entry as any).message?.usage?.cost?.total) {
					totalCost += (entry as any).message.usage.cost.total;
				}
			}
		} catch {
			// Ignore errors
		}
		return totalCost;
	}

	function setupFooter(ctx: any) {
		if (!ctx.hasUI) return;

		ctxRef = ctx;

		ctx.ui.setFooter((tui: any, theme: any, footerData: any) => {
			tuiRef = tui;

			return {
				render: (width: number): string[] => {
					// Query live context on each render to ensure current state
					const contextUsage = ctxRef.getContextUsage?.();
					const sessionCost = calculateSessionCost(ctxRef);

					const footerContext: FooterContext = {
						model: ctxRef.model,
						thinkingLevel: pi.getThinkingLevel(),
						usageCost: sessionCost,
						contextTokens: contextUsage?.tokens ?? null,
						contextPercent: contextUsage?.percent ?? null,
						contextWindow: contextUsage?.contextWindow ?? 0,
						cwd: ctxRef.cwd ?? "",
						gitBranch: footerData?.getGitBranch?.() ?? null,
						acmEnabled: acmEnabled,
					};

					return buildFooter(footerContext, width);
				},
				invalidate: () => {},
				dispose: () => {
					stopAnimation();
				},
			};
		});

		// Start animation loop (outside the render callback)
		startAnimation(tuiRef, 120);
	}

	// Setup on session start
	pi.on("session_start", async (_event, ctx) => {
		pi.events.emit("context-pilot:status_request", {});
		if (enabled && ctx.hasUI) {
			setupFooter(ctx);
		}
	});
}
