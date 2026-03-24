import { ansi, colors } from "./index.js";
import { visibleWidth } from "@mariozechner/pi-tui";

/**
 * ASCII Animation Configuration
 *
 * Each frame set is a string array. To change the active animation,
 * update the 'activeFrames' assignment below.
 */

const animations = {
  wave: [
    "▁▂▄▅▆█▆▅▄▂▁",
    "▂▁▂▄▅▆█▆▅▄▂",
    "▄▂▁▂▄▅▆█▆▅▄",
    "▅▄▂▁▂▄▅▆█▆▅",
    "▆▅▄▂▁▂▄▅▆█▆",
    "█▆▅▄▂▁▂▄▅▆█",
    "▆█▆▅▄▂▁▂▄▅▆",
    "▅▆█▆▅▄▂▁▂▄▅",
    "▄▅▆█▆▅▄▂▁▂▄",
    "▂▄▅▆█▆▅▄▂▁▂",
  ],
  pulse: [
    "  ○  ",
    "  ◔  ",
    "  ◑  ",
    "  ◕  ",
    "  ●  ",
    "  ◕  ",
    "  ◑  ",
    "  ◔  ",
  ],
  spinner: ["◜", "◠", "◝", "◞", "◡", "◟"],
  arrows: ["←", "↖", "↑", "↗", "→", "↘", "↓", "↙"],
};

/**
 * ACTIVE ANIMATION
 * Change this value to switch styles: 'wave', 'pulse', 'braille', 'spinner', 'arrows'
 */
export const animation = animations.pulse;

// Animation state
export let animationFrame = 0;
export let animationInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Render the animated wave in a box
 * @param width - total width available for the footer line
 * @returns formatted string with borders and centered animation
 */
export function renderAnimationBox(width: number): string {
  const frame = animation[animationFrame]!;
  const accentColor = ansi.fg(colors.accent);
  const reset = ansi.reset;
  const sepColor = ansi.fg(colors.sep);

  // Box characters - uses vertical bar borders
  const left = `${sepColor}│${reset}`;
  const right = `${sepColor}│${reset}`;

  const contentWidth = visibleWidth(frame);
  const padding = Math.max(0, width - 2 - contentWidth);
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;

  return (
    left +
    " ".repeat(leftPad) +
    accentColor +
    frame +
    reset +
    " ".repeat(rightPad) +
    right
  );
}

/**
 * Start the animation loop
 */
export function startAnimation(
  tuiRef: any,
  intervalMs = 120,
): ReturnType<typeof setInterval> {
  if (animationInterval) {
    clearInterval(animationInterval);
  }

  animationInterval = setInterval(() => {
    animationFrame = (animationFrame + 1) % animation.length;
    tuiRef?.requestRender();
  }, intervalMs);

  return animationInterval;
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
