import * as fs from "node:fs/promises";
import * as path from "node:path";

import type { ExtensionAPI, ExtensionContext, ExtensionFactory } from "@mariozechner/pi-coding-agent";
import {
  DefaultResourceLoader,
  SessionManager,
  createAgentSession,
  createBashTool,
  createReadTool,
  getMarkdownTheme,
} from "@mariozechner/pi-coding-agent";
import { Container, Markdown, Spacer, Text } from "@mariozechner/pi-tui";

import {
  DEFAULT_MAX_SEARCH_RESULTS,
  MAX_TOOL_CALLS_TO_KEEP,
  LibrarianParams,
  asStringArray,
  clampNumber,
  computeOverallStatus,
  formatToolCall,
  getLastAssistantText,
  renderCombinedMarkdown,
  shorten,
  type LibrarianDetails,
  type LibrarianParamsType,
  type LibrarianRunDetails,
  type SubagentSelectionInfo,
} from "./librarian-core";
import { buildLibrarianSystemPrompt, buildLibrarianUserPrompt } from "./librarian-prompts";
import { loadLibrarianConfig } from "./librarian-settings";
import {
  buildNoCandidateError,
  createSelectionPlan,
  formatFinalFailureMessage,
  formatModelLabel,
  getNextModel,
  isAbortLikeError,
  isQuotaError,
  looksLikeSilentFailure,
  markTemporarilyUnavailable,
  type AttemptFailure,
  type ModelSelection,
  type UnavailableReason,
} from "./model-selection";

function createTurnBudgetExtension(maxTurns: number): ExtensionFactory {
  return (pi) => {
    let turnIndex = 0;

    pi.on("turn_start", async (event) => {
      turnIndex = event.turnIndex;
    });

    pi.on("tool_call", async () => {
      if (turnIndex < maxTurns - 1) return undefined;
      const humanTurn = Math.min(turnIndex + 1, maxTurns);
      return {
        block: true,
        reason: `Tool use is disabled on the final turn (turn ${humanTurn}/${maxTurns}). Provide your final answer now without calling tools.`,
      };
    });

    pi.on("tool_result", async (event) => {
      const remainingAfter = Math.max(0, maxTurns - (turnIndex + 1));
      const humanTurn = Math.min(turnIndex + 1, maxTurns);
      const budgetLine = `[turn budget] turn ${humanTurn}/${maxTurns}; remaining after this turn: ${remainingAfter}`;
      return {
        content: [...(event.content ?? []), { type: "text" as const, text: `\n\n${budgetLine}` }],
      };
    });
  };
}

export default function librarianExtension(pi: ExtensionAPI) {
  pi.registerTool({
    name: "librarian",
    label: "Librarian",
    description:
      "GitHub research scout for coding and personal-assistant tasks. Use when the answer likely lives in GitHub repos, exact repo/path locations are unknown, or you'd otherwise do exploratory gh search/tree probes plus ls/rg/fd/find/grep/read on fetched files. Librarian performs targeted reconnaissance in an isolated workspace and returns concise, path-first findings with line-ranged evidence.",
    parameters: LibrarianParams,

    async execute(_toolCallId, params: LibrarianParamsType, signal, onUpdate, ctx: ExtensionContext) {
      const query = params.query?.trim() ?? "";
      if (!query) {
        return {
          content: [{ type: "text" as const, text: "Invalid parameters: expected `query` to be a non-empty string." }],
          details: { status: "error", runs: [] } satisfies LibrarianDetails,
          isError: true,
        };
      }

      const repos = asStringArray(params.repos);
      const owners = asStringArray(params.owners);
      const config = loadLibrarianConfig(ctx.cwd);
      const maxSearchResults = clampNumber(params.maxSearchResults, 1, 100, config.maxSearchResults);
      const maxTurns = config.maxTurns;

      const workspaceBase = "/tmp/pi-librarian";
      await fs.mkdir(workspaceBase, { recursive: true });
      const workspace = await fs.mkdtemp(path.join(workspaceBase, "run-"));
      await fs.mkdir(path.join(workspace, "repos"), { recursive: true });

      const runs: LibrarianRunDetails[] = [
        { status: "running", query, turns: 0, toolCalls: [], startedAt: Date.now() },
      ];

      const modelRegistry = ctx.modelRegistry;
      const planResult = createSelectionPlan(config.models, ctx.model);
      if ("error" in planResult) {
        runs[0].status = "error";
        runs[0].error = planResult.error;
        runs[0].summaryText = planResult.error;
        runs[0].endedAt = Date.now();
        return {
          content: [{ type: "text" as const, text: planResult.error }],
          details: { status: "error", workspace, runs } satisfies LibrarianDetails,
          isError: true,
        };
      }

      const selectionPlan = planResult.plan;
      let currentSelection = getNextModel(selectionPlan, modelRegistry);

      if (!currentSelection) {
        const error = buildNoCandidateError(selectionPlan);
        runs[0].status = "error";
        runs[0].error = error;
        runs[0].summaryText = error;
        runs[0].endedAt = Date.now();
        return {
          content: [{ type: "text" as const, text: error }],
          details: { status: "error", workspace, runs } satisfies LibrarianDetails,
          isError: true,
        };
      }

      let subModel = currentSelection.model;
      let subagentSelection: SubagentSelectionInfo = { reason: currentSelection.reason };

      let lastUpdate = 0;
      const emitAll = (force = false) => {
        const now = Date.now();
        if (!force && now - lastUpdate < 120) return;
        lastUpdate = now;

        const status = computeOverallStatus(runs);
        const text = renderCombinedMarkdown(runs);
        onUpdate?.({
          content: [{ type: "text" as const, text }],
          details: {
            status, workspace,
            subagentProvider: subModel.provider,
            subagentModelId: subModel.id,
            subagentSelection,
            runs,
          } satisfies LibrarianDetails,
        });
      };
      emitAll(true);

      const systemPrompt = buildLibrarianSystemPrompt(maxTurns, workspace, maxSearchResults);

      let toolAborted = false;
      const activeSessions = new Set<{ abort: () => Promise<void> }>();

      const markAllAborted = () => {
        for (const run of runs) {
          if (run.status !== "running") continue;
          run.status = "aborted";
          run.summaryText = run.summaryText ?? "Aborted";
          run.endedAt = Date.now();
        }
      };

      const abortAll = async () => {
        if (toolAborted) return;
        toolAborted = true;
        markAllAborted();
        emitAll(true);
        await Promise.allSettled([...activeSessions].map((s) => s.abort()));
      };

      const onAbort = () => void abortAll();
      let abortListenerAdded = false;

      if (signal?.aborted) {
        await abortAll();
        return buildFinalResult(runs, workspace, subModel, subagentSelection);
      }

      if (signal) {
        signal.addEventListener("abort", onAbort);
        abortListenerAdded = true;
      }

      try {
        const wasAborted = () => toolAborted || signal?.aborted;
        const run = runs[0];
        const attemptFailures: AttemptFailure[] = [];

        const resourceLoader = new DefaultResourceLoader({
          noExtensions: true,
          noSkills: true,
          noPromptTemplates: true,
          noThemes: true,
          extensionFactories: [createTurnBudgetExtension(maxTurns)],
          systemPromptOverride: () => systemPrompt,
          skillsOverride: () => ({ skills: [], diagnostics: [] }),
        });

        const runAttempt = async (
          selection: ModelSelection,
        ): Promise<
          | { status: "success" }
          | { status: "aborted" }
          | { status: "failure"; message: string; error: unknown; reason: UnavailableReason }
        > => {
          run.status = "running";
          run.turns = 0;
          run.toolCalls = [];
          run.startedAt = Date.now();
          run.endedAt = undefined;
          run.error = undefined;
          run.summaryText = undefined;

          let session: ReturnType<typeof createAgentSession> extends Promise<infer R> ? R["session"] : never;
          let unsubscribe: (() => void) | undefined;

          try {
            const result = await createAgentSession({
              cwd: workspace,
              modelRegistry,
              resourceLoader,
              sessionManager: SessionManager.inMemory(workspace),
              model: selection.model,
              thinkingLevel: selection.thinkingLevel,
              tools: [createReadTool(workspace), createBashTool(workspace)],
            });
            session = result.session;
            activeSessions.add(session);

            unsubscribe = session.subscribe((event: { type: string; toolCallId?: string; toolName?: string; args?: unknown; isError?: boolean; turnIndex?: number }) => {
              switch (event.type) {
                case "turn_end":
                  run.turns += 1;
                  emitAll();
                  break;
                case "tool_execution_start":
                  run.toolCalls.push({
                    id: event.toolCallId!,
                    name: event.toolName!,
                    args: event.args,
                    startedAt: Date.now(),
                  });
                  if (run.toolCalls.length > MAX_TOOL_CALLS_TO_KEEP) {
                    run.toolCalls.splice(0, run.toolCalls.length - MAX_TOOL_CALLS_TO_KEEP);
                  }
                  emitAll(true);
                  break;
                case "tool_execution_end": {
                  const call = run.toolCalls.find((c) => c.id === event.toolCallId);
                  if (call) {
                    call.endedAt = Date.now();
                    call.isError = event.isError;
                  }
                  emitAll(true);
                  break;
                }
              }
            });

            await session.prompt(buildLibrarianUserPrompt(query, repos, owners, maxSearchResults), {
              expandPromptTemplates: false,
            });

            run.summaryText = getLastAssistantText(session.state.messages as { role: string; content: { type: string; text?: string }[] }[]).trim();
            if (!run.summaryText) run.summaryText = wasAborted() ? "Aborted" : "(no output)";
            run.status = wasAborted() ? "aborted" : "done";
            run.endedAt = Date.now();
            emitAll(true);

            if (run.status === "aborted") return { status: "aborted" };
            if (looksLikeSilentFailure(run)) {
              const message = "Model produced no output and made no tool calls.";
              run.status = "error";
              run.error = message;
              run.summaryText = message;
              run.endedAt = Date.now();
              emitAll(true);
              return { status: "failure", message, error: new Error(message), reason: "error" };
            }
            return { status: "success" };
          } catch (error) {
            const aborted = wasAborted() || isAbortLikeError(error);
            const message = aborted ? "Aborted" : error instanceof Error ? error.message : String(error);
            run.status = aborted ? "aborted" : "error";
            run.error = aborted ? undefined : message;
            run.summaryText = message;
            run.endedAt = Date.now();
            emitAll(true);
            if (aborted) return { status: "aborted" };
            return { status: "failure", message, error, reason: isQuotaError(error) ? "quota" : "error" };
          } finally {
            if (session) activeSessions.delete(session);
            unsubscribe?.();
            session?.dispose();
          }
        };

        try {
          await resourceLoader.reload();

          while (currentSelection) {
            subModel = currentSelection.model;
            subagentSelection = { reason: currentSelection.reason };
            emitAll(true);

            const attemptResult = await runAttempt(currentSelection);
            if (attemptResult.status === "success" || attemptResult.status === "aborted") break;

            attemptFailures.push({
              modelLabel: formatModelLabel(currentSelection),
              reason: attemptResult.reason,
              message: attemptResult.message,
            });
            markTemporarilyUnavailable(currentSelection.model, attemptResult.reason);

            const nextSelection = getNextModel(selectionPlan, modelRegistry);
            if (!nextSelection) {
              const error = formatFinalFailureMessage(attemptFailures);
              run.status = "error";
              run.error = error;
              run.summaryText = error;
              run.endedAt = Date.now();
              emitAll(true);
              break;
            }
            currentSelection = nextSelection;
          }
        } catch (error) {
          const aborted = wasAborted() || isAbortLikeError(error);
          const message = aborted ? "Aborted" : error instanceof Error ? error.message : String(error);
          run.status = aborted ? "aborted" : "error";
          run.error = aborted ? undefined : message;
          run.summaryText = message;
          run.endedAt = Date.now();
          emitAll(true);
        }

        return buildFinalResult(runs, workspace, subModel, subagentSelection);
      } finally {
        if (signal && abortListenerAdded) signal.removeEventListener("abort", onAbort);
      }
    },

    renderCall(args, theme) {
      const parsed = args as LibrarianParamsType | undefined;
      const query = parsed?.query?.trim() ?? "";
      const repoCount = Array.isArray(parsed?.repos) ? parsed.repos.length : 0;
      const ownerCount = Array.isArray(parsed?.owners) ? parsed.owners.length : 0;
      const preview = shorten(query.replace(/\s+/g, " ").trim(), 70);

      const scope = theme.fg("muted", `repos:${repoCount} owners:${ownerCount}`);
      const text = preview ? `${scope} · ${preview}` : scope;
      return new Text(text, 0, 0);
    },

    renderResult(result, { expanded, isPartial }, theme) {
      const details = result.details as LibrarianDetails | undefined;
      if (!details) {
        const text = result.content[0];
        return new Text(text?.type === "text" ? text.text : "(no output)", 0, 0);
      }

      const status = isPartial ? "running" : details.status;
      const icon =
        status === "done" ? theme.fg("success", "✓") :
        status === "error" ? theme.fg("error", "✗") :
        status === "aborted" ? theme.fg("warning", "◼") :
        theme.fg("warning", "⏳");

      const run = details.runs[0];
      const totalToolCalls = run?.toolCalls.length ?? 0;
      const totalTurns = run?.turns ?? 0;

      const header =
        icon + " " +
        theme.fg("toolTitle", theme.bold("librarian ")) +
        theme.fg("dim",
          `${details.subagentProvider ?? "?"}/${details.subagentModelId ?? "?"} • ${totalTurns} turns • ${totalToolCalls} tool call${totalToolCalls === 1 ? "" : "s"}`,
        );

      const workspaceLine = details.workspace
        ? `${theme.fg("muted", "workspace: ")}${theme.fg("toolOutput", details.workspace)}`
        : theme.fg("muted", "workspace: (none)");

      const selectionReasonLine = details.subagentSelection
        ? `${theme.fg("muted", "selection: ")}${theme.fg("toolOutput", details.subagentSelection.reason)}`
        : undefined;

      let toolsText = "";
      if (run && run.toolCalls.length > 0) {
        const calls = expanded ? run.toolCalls : run.toolCalls.slice(-6);
        const lines: string[] = [theme.fg("muted", "Tools:")];
        for (const call of calls) {
          const callIcon = call.isError ? theme.fg("error", "✗") : theme.fg("dim", "→");
          lines.push(`${callIcon} ${theme.fg("toolOutput", formatToolCall(call))}`);
        }
        if (!expanded && run.toolCalls.length > 6) lines.push(theme.fg("muted", "(Ctrl+O to expand)"));
        toolsText = lines.join("\n");
      }

      if (status === "running") {
        let text = `${header}\n${workspaceLine}`;
        if (expanded && selectionReasonLine) text += `\n${selectionReasonLine}`;
        if (toolsText) text += `\n\n${toolsText}`;
        text += `\n\n${theme.fg("muted", "Searching GitHub…")}`;
        return new Text(text, 0, 0);
      }

      const mdTheme = getMarkdownTheme();
      const combined =
        (result.content[0]?.type === "text" ? result.content[0].text : renderCombinedMarkdown(details.runs)).trim() ||
        "(no output)";

      if (!expanded) {
        const previewLines = combined.split("\n").slice(0, 18).join("\n");
        let text = `${header}\n${workspaceLine}\n\n${theme.fg("toolOutput", previewLines)}`;
        if (combined.split("\n").length > 18) text += `\n${theme.fg("muted", "(Ctrl+O to expand)")}`;
        if (toolsText) text += `\n\n${toolsText}`;
        return new Text(text, 0, 0);
      }

      const container = new Container();
      container.addChild(new Text(header, 0, 0));
      container.addChild(new Text(workspaceLine, 0, 0));
      if (selectionReasonLine) container.addChild(new Text(selectionReasonLine, 0, 0));
      if (toolsText) {
        container.addChild(new Spacer(1));
        container.addChild(new Text(toolsText, 0, 0));
      }
      container.addChild(new Spacer(1));
      container.addChild(new Markdown(combined, 0, 0, mdTheme));
      return container;
    },
  });
}

function buildFinalResult(
  runs: LibrarianRunDetails[],
  workspace: string,
  subModel: { provider: string; id: string },
  subagentSelection: SubagentSelectionInfo,
) {
  const status = computeOverallStatus(runs);
  const text = renderCombinedMarkdown(runs);
  return {
    content: [{ type: "text" as const, text }],
    details: {
      status, workspace, runs,
      subagentProvider: subModel.provider,
      subagentModelId: subModel.id,
      subagentSelection,
    } satisfies LibrarianDetails,
    isError: status === "error",
  };
}
