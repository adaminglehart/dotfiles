import { ansi, colors } from "./index.js";
import { visibleWidth } from "@mariozechner/pi-tui";

/**
 * AQUARIUM & ANIMATION CONFIGURATION
 * Edit these values to tune the footer behavior.
 */
export const CONFIG = {
  // Frame rate (ms)
  INTERVAL_MS: 100,

  // Loading Box Dimensions
  BOX_WIDTH: 5,
  BOX_CONTENT_WIDTH: 3,

  // Aquarium Population
  MAX_FISH_COUNT: 25,
  CONTEXT_PERCENT_PER_FISH: 4, // 1 fish for every 4% context
  AQUARIUM_ROWS: 3, // Now configurable!

  // Speed (characters per frame)
  MIN_SPEED: 0.075,
  MAX_SPEED_VARIANCE: 0.15,

  // Fish Visuals
  SPRITES: {
    RIGHT: ["><>", "><(((º>", "><*))>", "><))))°>"],
    LEFT: ["<><", "<°))><", "<*))><", "<°))))><"],
  },
};

/**
 * Loading Box Animation Frames
 */
export const animations: Record<string, string[][]> = {
  matrix: [
    ["⢀  ", "  ⠘"],
    ["⢠  ", "  ⢰"],
    ["⢰  ", "  ⠠"],
    ["⠘  ", "  ⢀"],
  ],
  pulse: [
    [" . ", " . "],
    [" o ", " o "],
    [" O ", " O "],
    [" # ", " # "],
  ],
  fish: [
    ["<>< ", "    "],
    [" <><", "    "],
    ["    ", " <><"],
    ["    ", "<>< "],
  ],
};

const styleKeys = Object.keys(animations);
let currentStyleIdx = 0;
export let activeFrames = animations[styleKeys[currentStyleIdx]!]!;

export function cycleAnimation(): string {
  currentStyleIdx = (currentStyleIdx + 1) % styleKeys.length;
  const newStyle = styleKeys[currentStyleIdx]!;
  activeFrames = animations[newStyle]!;
  animationFrame = 0;
  return newStyle;
}

// Global animation frame
export let animationFrame = 0;
let animationInterval: ReturnType<typeof setInterval> | null = null;

// Aquarium state
interface Fish {
  x: number;
  y: number;
  speed: number;
  dir: 1 | -1;
  visual: string;
}

let aquariumFish: Fish[] = [];
let manualFishCount = 0;

export function addManualFish() {
	manualFishCount++;
}

function randomizeFish(fish: Fish, width: number) {
  fish.y = Math.floor(Math.random() * CONFIG.AQUARIUM_ROWS);
  fish.speed = CONFIG.MIN_SPEED + Math.random() * CONFIG.MAX_SPEED_VARIANCE;
  fish.dir = Math.random() > 0.5 ? 1 : -1;

  const pool = fish.dir === 1 ? CONFIG.SPRITES.RIGHT : CONFIG.SPRITES.LEFT;
  fish.visual = pool[Math.floor(Math.random() * pool.length)]!;

  fish.x = fish.dir === 1 ? -15 : width + 15;
}

function initAquarium() {
  // Pre-allocate a larger pool for manual fish
  aquariumFish = Array.from({ length: 100 }, () => {
    const fish = {} as Fish;
    randomizeFish(fish, 100);
    fish.x = Math.random() * 120 - 10;
    fish.speed = CONFIG.MIN_SPEED + Math.random() * CONFIG.MAX_SPEED_VARIANCE;
    return fish;
  });
}

initAquarium();

/**
 * Renders the aquarium line using a character buffer
 */
export function renderAquarium(
  width: number,
  contextPercent: number,
): string[] {
  const contextFish = Math.floor((contextPercent || 0) / CONFIG.CONTEXT_PERCENT_PER_FISH) + 1;
  const numFish = Math.min(100, contextFish + manualFishCount);

  const buffer: string[][] = Array.from({ length: CONFIG.AQUARIUM_ROWS }, () =>
    new Array(width).fill(" "),
  );

  for (let i = 0; i < numFish; i++) {
    const fish = aquariumFish[i]!;
    fish.x += fish.speed * fish.dir;

    const vWidth = visibleWidth(fish.visual);
    if (fish.dir === 1 && fish.x > width + 5) randomizeFish(fish, width);
    if (fish.dir === -1 && fish.x < -vWidth - 5) randomizeFish(fish, width);

    const startX = Math.floor(fish.x);
    for (let vIdx = 0; vIdx < vWidth; vIdx++) {
      const x = startX + vIdx;
      if (x >= 0 && x < width) {
        buffer[fish.y]![x] =
          ansi.fg(colors.input) + fish.visual[vIdx] + ansi.reset;
      }
    }
  }

  return buffer.map((row) => row.join(""));
}

/**
 * Renders the status block to fit exactly 'targetHeight' lines
 */
export function renderAnimationBlock(targetHeight: number): string[] {
  const frame = activeFrames[animationFrame]!;
  const accentColor = ansi.fg(colors.accent);
  const sepColor = ansi.fg(colors.sep);
  const reset = ansi.reset;

  const lines: string[] = [];

  // Top border
  lines.push(`${sepColor}┌───┐${reset}`);

  // Middle lines (content)
  const contentLines = targetHeight - 2;
  for (let i = 0; i < contentLines; i++) {
    // Use frame content if available, otherwise space
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

export function startAnimation(
  tuiRef: any,
  intervalMs = CONFIG.INTERVAL_MS,
): void {
  if (animationInterval) clearInterval(animationInterval);
  animationInterval = setInterval(() => {
    animationFrame = (animationFrame + 1) % activeFrames.length;
    tuiRef?.requestRender();
  }, intervalMs);
}

export function stopAnimation(): void {
  if (animationInterval) {
    clearInterval(animationInterval);
    animationInterval = null;
  }
  animationFrame = 0;
}
