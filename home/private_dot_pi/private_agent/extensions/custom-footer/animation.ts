import { ansi, colors } from "./index.js";
import { aquariumScene } from "./scenes/aquarium.js";
import { lifeScene } from "./scenes/life.js";
import type { Scene } from "./scenes/types.js";

/**
 * GLOBAL CONFIGURATION
 */
export const CONFIG = {
  INTERVAL_MS: 100,
  BOX_WIDTH: 5,
  BOX_CONTENT_WIDTH: 3,
  SPEEDS: {
    PAUSED: 500, // Very slow when agent is idle
    ACTIVE: 60, // Fast when agent is working
    THINKING: 150, // Moderate when thinking
  },
};

/**
 * Agent State
 */
type AgentState = "paused" | "active" | "thinking";
let agentState: AgentState = "paused";

export function setAgentState(state: AgentState): void {
  agentState = state;
  updateAnimationSpeed();
}

export function getAgentState(): AgentState {
  return agentState;
}

/**
 * Loading Box Animation Frames
 */
export const animations: Record<string, string[][]> = {
  // matrix: [
  //   ["⢀  ", "  ⠘"],
  //   ["⢠  ", "  ⢰"],
  //   ["⢰  ", "  ⠠"],
  //   ["⠘  ", "  ⢀"],
  // ],
  // pulse: [
  //   [" . ", " . "],
  //   [" o ", " o "],
  //   [" O ", " O "],
  //   [" # ", " # "],
  // ],
  // fish: [
  //   ["<>< ", "    "],
  //   [" <><", "    "],
  //   ["    ", " <><"],
  //   ["    ", "<>< "],
  // ],
  organic: [
    // Flowing organic pattern that looks alive
    ["∴∵ ", " ∴∵"],
    [" ∴∵", "∵∴ "],
    ["∵∴ ", " ∵∴"],
    [" ∵∴", "∴∵ "],
    ["∴∵ ", "∵ ∴"],
    ["∵ ∴", " ∴∵"],
    [" ∴∵", "∴ ∵"],
    ["∴ ∵", "∵∴ "],
  ],
  flow: [
    // Water-like flowing pattern
    ["≈≈ ", " ∼∼"],
    [" ≈≈", "∼∼ "],
    ["∼∼ ", " ≈≈"],
    [" ∼∼", "≈≈ "],
    ["≈∼ ", " ≈∼"],
    [" ≈∼", "∼≈ "],
    ["∼≈ ", " ∼≈"],
    [" ∼≈", "≈∼ "],
  ],
  bloom: [
    // Organic growth pattern
    ["·  ", " · "],
    ["·· ", " ··"],
    ["∴  ", " ∴ "],
    ["∴· ", " ∴·"],
    ["∵  ", " ∵ "],
    ["∵∴ ", " ∵∴"],
    ["✧∵ ", " ✧∵"],
    ["✧✧ ", " ✧✧"],
    ["✧∵ ", " ✧∵"],
    ["∵∴ ", " ∵∴"],
    ["∵  ", " ∵ "],
    ["∴· ", " ∴·"],
    ["∴  ", " ∴ "],
    ["·· ", " ··"],
    ["·  ", " · "],
    ["   ", "   "],
  ],
};

const styleKeys = Object.keys(animations);
let currentStyleIdx = 2; // Default to "organic"
export let activeFrames = animations[styleKeys[currentStyleIdx]!]!;

export function cycleAnimation(): string {
  currentStyleIdx = (currentStyleIdx + 1) % styleKeys.length;
  const newStyle = styleKeys[currentStyleIdx]!;
  activeFrames = animations[newStyle]!;
  animationFrame = 0;
  return newStyle;
}

/**
 * SCENE MANAGEMENT
 */
const scenes: Scene[] = [lifeScene, aquariumScene];
let currentSceneIdx = 1;

export function getActiveScene(): Scene {
  return scenes[currentSceneIdx]!;
}

export function cycleScene(): string {
  currentSceneIdx = (currentSceneIdx + 1) % scenes.length;
  return scenes[currentSceneIdx]!.name;
}

// Global animation frame
export let animationFrame = 0;
let animationInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Renders the status block to fit exactly 'targetHeight' lines
 */
export function renderAnimationBlock(targetHeight: number): string[] {
  const frame = activeFrames[animationFrame % activeFrames.length]!;
  const accentColor = ansi.fg(colors.accent);
  const sepColor = ansi.fg(colors.sep);
  const reset = ansi.reset;

  const lines: string[] = [];

  // Top border
  lines.push(`${sepColor}┌───┐${reset}`);

  // Middle lines (content)
  const contentLines = targetHeight - 2;
  for (let i = 0; i < contentLines; i++) {
    const frameContent = frame[i % frame.length] || "   ";
    const padded = frameContent
      .padEnd(CONFIG.BOX_CONTENT_WIDTH)
      .slice(0, CONFIG.BOX_CONTENT_WIDTH);
    lines.push(
      `${sepColor}│${reset}${accentColor}${padded}${reset}${sepColor}│${reset}`,
    );
  }

  // Bottom border
  lines.push(`${sepColor}└───┘${reset}`);

  return lines;
}

let tuiReference: any = null;

export function startAnimation(tuiRef: any): void {
  tuiReference = tuiRef;
  updateAnimationSpeed();
}

function updateAnimationSpeed(): void {
  if (animationInterval) clearInterval(animationInterval);

  // Choose speed based on agent state
  let intervalMs = CONFIG.INTERVAL_MS;
  switch (agentState) {
    case "paused":
      intervalMs = CONFIG.SPEEDS.PAUSED;
      break;
    case "active":
      intervalMs = CONFIG.SPEEDS.ACTIVE;
      break;
    case "thinking":
      intervalMs = CONFIG.SPEEDS.THINKING;
      break;
  }

  animationInterval = setInterval(() => {
    animationFrame = (animationFrame + 1) % 1000; // Just a generic counter
    tuiReference?.requestRender();
  }, intervalMs);
}

export function stopAnimation(): void {
  if (animationInterval) {
    clearInterval(animationInterval);
    animationInterval = null;
  }
  animationFrame = 0;
  tuiReference = null;
}
