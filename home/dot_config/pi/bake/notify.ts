import { $ } from "bun";

export async function sendNotification(message: string, title = "bake"): Promise<void> {
  try {
    await $`osascript -e ${`display notification "${message}" with title "${title}" sound name "default"`}`.quiet().nothrow();
  } catch {
    // Non-fatal: notifications are best-effort
  }
}
