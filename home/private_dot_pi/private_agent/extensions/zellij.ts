/**
 * Zellij Extension
 *
 * Gives the agent the ability to interact with zellij terminal multiplexer:
 * - Run commands in new panes (floating, directional, in-place)
 * - Read pane content via dump-screen
 * - Send keystrokes to the focused pane
 * - Manage panes and tabs (close, focus, rename, resize, etc.)
 *
 * Safety: The agent can only send keys to or close panes it created.
 * Agent-created panes are tracked by pane ID (from list-clients) and
 * verified before any write/destructive operation.
 *
 * Requires: running inside a zellij session (checks $ZELLIJ env var)
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import {
  truncateTail,
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
  formatSize,
} from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { StringEnum } from "@mariozechner/pi-ai";
import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export default function (pi: ExtensionAPI) {
  // Track pane IDs we've created (e.g. "terminal_2")
  const ownedPaneIds = new Set<string>();

  pi.on("session_start", async (_event, ctx) => {
    if (!process.env.ZELLIJ) {
      ctx.ui.notify(
        "Zellij extension loaded but not inside a zellij session ($ZELLIJ not set)",
        "warning"
      );
    }
  });

  async function zj(
    args: string[],
    signal?: AbortSignal,
    timeout = 10000
  ): Promise<{ stdout: string; stderr: string; code: number }> {
    const result = await pi.exec("zellij", args, { signal, timeout });
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      code: result.code ?? 0,
    };
  }

  /**
   * Get the focused pane ID for our client from list-clients.
   * Returns e.g. "terminal_2" or null if unavailable.
   */
  async function getFocusedPaneId(
    signal?: AbortSignal
  ): Promise<string | null> {
    const result = await zj(["action", "list-clients"], signal);
    if (result.code !== 0) return null;

    // Output format:
    // CLIENT_ID ZELLIJ_PANE_ID RUNNING_COMMAND
    // 1         terminal_1     bash
    const lines = result.stdout.trim().split("\n");
    if (lines.length < 2) return null;

    // Parse first data row (our client)
    const fields = lines[1].trim().split(/\s+/);
    return fields[1] ?? null;
  }

  /**
   * Check if the currently focused pane was created by the agent.
   */
  async function isFocusedPaneOurs(signal?: AbortSignal): Promise<boolean> {
    const paneId = await getFocusedPaneId(signal);
    if (!paneId) return false;
    return ownedPaneIds.has(paneId);
  }

  // --- zellij_run: Run a command in a new pane ---
  pi.registerTool({
    name: "zellij_run",
    label: "Zellij Run",
    description:
      "Run a command in a new zellij pane. Use this to start long-running processes (dev servers, watch modes, tests) in separate panes while continuing to work. The command runs independently in its own pane.",
    parameters: Type.Object({
      command: Type.String({
        description: "The command to run (e.g. 'npm run dev', 'cargo watch')",
      }),
      direction: Type.Optional(
        StringEnum(["right", "down", "floating"] as const, {
          description:
            "Where to open the pane. 'floating' opens a floating pane overlay. Omit to let zellij pick the best spot.",
        })
      ),
      name: Type.Optional(
        Type.String({
          description: "Name for the pane (shown in the pane frame)",
        })
      ),
      cwd: Type.Optional(
        Type.String({ description: "Working directory for the command" })
      ),
      close_on_exit: Type.Optional(
        Type.Boolean({
          description:
            "Close the pane when the command exits. Defaults to false so you can see output.",
        })
      ),
      in_place: Type.Optional(
        Type.Boolean({
          description:
            "Open in place of the current pane, temporarily suspending it",
        })
      ),
      start_suspended: Type.Optional(
        Type.Boolean({
          description:
            "Start the command suspended, requiring ENTER to run",
        })
      ),
    }),
    async execute(_toolCallId, params, signal) {
      const zjArgs: string[] = ["action", "new-pane"];

      if (params.direction === "floating") {
        zjArgs.push("--floating");
      } else if (params.direction) {
        zjArgs.push("--direction", params.direction);
      }
      if (params.name) zjArgs.push("--name", params.name);
      if (params.cwd) zjArgs.push("--cwd", params.cwd);
      if (params.close_on_exit) zjArgs.push("--close-on-exit");
      if (params.in_place) zjArgs.push("--in-place");
      if (params.start_suspended) zjArgs.push("--start-suspended");

      zjArgs.push("--", "bash", "-c", params.command);

      const result = await zj(zjArgs, signal);

      if (result.code !== 0) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to open pane: ${result.stderr || result.stdout}`,
            },
          ],
          isError: true,
        };
      }

      // new-pane focuses the new pane, so list-clients gives us its ID
      const paneId = await getFocusedPaneId(signal);
      if (paneId) {
        ownedPaneIds.add(paneId);
      }

      const location = params.direction || "auto";
      const paneName = params.name ? ` "${params.name}"` : "";
      return {
        content: [
          {
            type: "text",
            text: `Started \`${params.command}\` in ${location} pane${paneName}`,
          },
        ],
        details: { command: params.command, direction: location, paneId },
      };
    },
  });

  // --- zellij_read_pane: Dump pane content ---
  pi.registerTool({
    name: "zellij_read_pane",
    label: "Zellij Read Pane",
    description:
      "Read the content of the currently focused zellij pane. Useful for checking the output of a running process in another pane. Focus a different pane first with zellij_manage if needed.",
    parameters: Type.Object({
      full_scrollback: Type.Optional(
        Type.Boolean({
          description:
            "Include full scrollback buffer, not just visible content. Defaults to false.",
        })
      ),
    }),
    async execute(_toolCallId, params, signal) {
      const tmpPath = join(tmpdir(), `zellij-dump-${Date.now()}.txt`);

      try {
        const zjArgs = ["action", "dump-screen", tmpPath];
        if (params.full_scrollback) zjArgs.splice(2, 0, "--full");

        const result = await zj(zjArgs, signal);
        if (result.code !== 0) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to dump pane: ${result.stderr || result.stdout}`,
              },
            ],
            isError: true,
          };
        }

        const raw = await readFile(tmpPath, "utf-8");

        const truncation = truncateTail(raw, {
          maxLines: DEFAULT_MAX_LINES,
          maxBytes: DEFAULT_MAX_BYTES,
        });

        let text = truncation.content;
        if (truncation.truncated) {
          text += `\n\n[Output truncated: showing last ${truncation.outputLines} of ${truncation.totalLines} lines`;
          text += ` (${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)}).`;
          text += ` Full dump saved to: ${tmpPath}]`;
        } else {
          await unlink(tmpPath).catch(() => {});
        }

        return {
          content: [{ type: "text", text }],
          details: { truncated: truncation.truncated },
        };
      } catch (err: any) {
        return {
          content: [
            { type: "text", text: `Error reading pane: ${err.message}` },
          ],
          isError: true,
        };
      }
    },
  });

  // --- zellij_send_keys: Write characters to focused pane ---
  pi.registerTool({
    name: "zellij_send_keys",
    label: "Zellij Send Keys",
    description:
      'Send keystrokes to the currently focused zellij pane. Only works on panes created by this agent (via zellij_run). Focus the target pane first with zellij_manage if needed. For special keys use escape sequences: "\\n" for Enter, "\\x03" for Ctrl+C, "\\x04" for Ctrl+D, "\\x1b" for Escape.',
    parameters: Type.Object({
      chars: Type.String({
        description: "Characters to send to the focused pane.",
      }),
    }),
    async execute(_toolCallId, params, signal) {
      if (!(await isFocusedPaneOurs(signal))) {
        return {
          content: [
            {
              type: "text",
              text: "Blocked: the focused pane was not created by this agent. You can only send keys to panes you created with zellij_run.",
            },
          ],
          isError: true,
        };
      }

      const result = await zj(
        ["action", "write-chars", params.chars],
        signal
      );

      if (result.code !== 0) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to send keys: ${result.stderr || result.stdout}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: "Sent keys to focused pane" }],
      };
    },
  });

  // --- zellij_manage: Pane and tab management ---

  const destructivePaneActions = new Set([
    "close-pane",
    "rename-pane",
    "toggle-fullscreen",
    "toggle-pane-embed-or-floating",
    "resize",
  ]);

  const safeActions = [
    "focus-next-pane",
    "focus-previous-pane",
    "move-focus",
    "toggle-floating-panes",
    "go-to-next-tab",
    "go-to-previous-tab",
    "go-to-tab",
    "go-to-tab-name",
    "query-tab-names",
    "list-sessions",
  ] as const;

  const destructiveActions = [
    "close-pane",
    "rename-pane",
    "toggle-fullscreen",
    "toggle-pane-embed-or-floating",
    "resize",
  ] as const;

  const allActions = [...safeActions, ...destructiveActions] as const;

  pi.registerTool({
    name: "zellij_manage",
    label: "Zellij Manage",
    description: `Manage zellij panes, tabs, and sessions. Destructive pane actions (close-pane, rename-pane, resize, toggle-fullscreen, toggle-pane-embed-or-floating) only work on panes created by this agent.

Actions:
- focus-next-pane / focus-previous-pane: cycle pane focus
- move-focus <direction>: move focus (right/left/up/down) — pass direction as arg
- toggle-floating-panes: show/hide floating panes
- go-to-tab <index> / go-to-tab-name <name>: switch tabs — pass index or name as arg
- go-to-next-tab / go-to-previous-tab: cycle tabs
- query-tab-names: list all tab names
- list-sessions: list active zellij sessions
- close-pane: close focused pane (agent-created only)
- rename-pane <name>: rename focused pane (agent-created only) — pass name as arg
- resize <increase|decrease> [direction]: resize pane (agent-created only)
- toggle-fullscreen: fullscreen focused pane (agent-created only)
- toggle-pane-embed-or-floating: convert pane type (agent-created only)`,
    parameters: Type.Object({
      action: StringEnum([...allActions], {
        description: "The management action to perform",
      }),
      args: Type.Optional(
        Type.String({
          description:
            "Space-separated arguments for the action (e.g. direction for move-focus, name for rename, index for go-to-tab)",
        })
      ),
    }),
    async execute(_toolCallId, params, signal) {
      // Capture pane ID before close so we can clean up tracking
      let closingPaneId: string | null = null;

      if (destructivePaneActions.has(params.action)) {
        const paneId = await getFocusedPaneId(signal);
        if (!paneId || !ownedPaneIds.has(paneId)) {
          return {
            content: [
              {
                type: "text",
                text: `Blocked: "${params.action}" only works on panes created by this agent. The currently focused pane was not created by zellij_run.`,
              },
            ],
            isError: true,
          };
        }
        if (params.action === "close-pane") {
          closingPaneId = paneId;
        }
      }

      let zjArgs: string[];
      const extraArgs = params.args?.split(" ").filter(Boolean) ?? [];

      if (params.action === "list-sessions") {
        zjArgs = ["list-sessions"];
      } else {
        zjArgs = ["action", params.action, ...extraArgs];
      }

      const result = await zj(zjArgs, signal);

      if (result.code !== 0) {
        return {
          content: [
            {
              type: "text",
              text: `Action "${params.action}" failed: ${result.stderr || result.stdout}`,
            },
          ],
          isError: true,
        };
      }

      // Remove closed pane from tracking
      if (closingPaneId) {
        ownedPaneIds.delete(closingPaneId);
      }

      const output = (result.stdout || result.stderr).trim();
      const text = output
        ? `${params.action}: ${output}`
        : `${params.action} completed`;

      return {
        content: [{ type: "text", text }],
        details: { action: params.action, args: params.args },
      };
    },
  });
}
