import { ansi, colors } from "./index.js";

/**
 * ASCII Animation Configuration
 *
 * Each frame set is an array of [line1, line2, line3] tuples (5x3 content).
 */

export const animations: Record<string, string[][]> = {
  fish: [
    ["<><  ", "     ", "     "],
    [" <>< ", "     ", "     "],
    ["  <><", "     ", "     "],
    ["   ><", "     ", "     "],
    ["     ", "  <><", "     "],
    ["     ", " <>< ", "     "],
    ["     ", "<><  ", "     "],
    ["     ", "     ", "<><  "],
    ["     ", "     ", " <>< "],
    ["     ", "     ", "  <><"],
  ],
  clock: [
    ["  |  ", "  o  ", "     "],
    ["     ", "  o--", "     "],
    ["     ", "  o  ", "  |  "],
    ["     ", "--o  ", "     "],
  ],
};

const styleKeys = Object.keys(animations);
let currentStyleIdx = 0;

/**
 * ACTIVE ANIMATION
 */
export let activeFrames = animations[styleKeys[currentStyleIdx]!]!;

/**
 * Cycle to the next animation style
 * @returns The name of the new animation style
 */
export function cycleAnimation(): string {
  currentStyleIdx = (currentStyleIdx + 1) % styleKeys.length;
  const newStyle = styleKeys[currentStyleIdx]!;
  activeFrames = animations[newStyle]!;
  animationFrame = 0; // Reset frame to start of new animation
  return newStyle;
}

// Animation state
export let animationFrame = 0;
let animationInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Renders a 5x3 animation block (3 lines)
 * @returns Array of 3 strings
 */
export function renderAnimationBlock(): string[] {
  const frame = activeFrames[animationFrame]!;
  const accentColor = ansi.fg(colors.accent);
  const reset = ansi.reset;

  return [
    `${accentColor}${frame[0]}${reset}`,
    `${accentColor}${frame[1]}${reset}`,
    `${accentColor}${frame[2]}${reset}`,
  ];
}

/**
 * Start the animation loop
 */
export function startAnimation(tuiRef: any, intervalMs = 150): void {
  if (animationInterval) clearInterval(animationInterval);

  animationInterval = setInterval(() => {
    animationFrame = (animationFrame + 1) % activeFrames.length;
    tuiRef?.requestRender();
  }, intervalMs);
}

/**
 * Stop and cleanup the animation
 */
export function stopAnimation(): void {
  if (animationInterval) {
    clearInterval(animationInterval);
    animationInterval = null;
  }
  animationFrame = 0;
}
