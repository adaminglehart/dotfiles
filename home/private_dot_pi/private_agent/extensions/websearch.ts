/**
 * WebSearch Tool - Search the web using Exa AI
 *
 * Performs real-time web searches via Exa AI's MCP API.
 * Supports configurable result counts, live crawling modes, and search types.
 *
 * Usage:
 * - Copy this file to ~/.pi/agent/extensions/ or your project's .pi/extensions/
 * - The tool will be automatically available to the LLM
 */

import { Type } from "@sinclair/typebox";
import { StringEnum } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const API_CONFIG = {
	BASE_URL: "https://mcp.exa.ai",
	ENDPOINTS: {
		SEARCH: "/mcp",
	},
	DEFAULT_NUM_RESULTS: 8,
	DEFAULT_CONTEXT_MAX_CHARS: 10000,
	TIMEOUT_MS: 25000,
} as const;

interface McpSearchRequest {
	jsonrpc: string;
	id: number;
	method: string;
	params: {
		name: string;
		arguments: {
			query: string;
			numResults?: number;
			livecrawl?: "fallback" | "preferred";
			type?: "auto" | "fast" | "deep";
			contextMaxCharacters?: number;
		};
	};
}

interface McpSearchResponse {
	jsonrpc: string;
	result: {
		content: Array<{
			type: string;
			text: string;
		}>;
	};
}

const DESCRIPTION = `- Search the web using Exa AI - performs real-time web searches and can scrape content from specific URLs
- Provides up-to-date information for current events and recent data
- Supports configurable result counts and returns the content from the most relevant websites
- Use this tool for accessing information beyond knowledge cutoff
- Searches are performed automatically within a single API call

Usage notes:
  - Supports live crawling modes: 'fallback' (backup if cached unavailable) or 'preferred' (prioritize live crawling)
  - Search types: 'auto' (balanced), 'fast' (quick results), 'deep' (comprehensive search)
  - Configurable context length for optimal LLM integration
  - Domain filtering and advanced search options available

The current year is {{year}}. You MUST use this year when searching for recent information or current events
- Example: If the current year is 2026 and the user asks for "latest AI news", search for "AI news 2026", NOT "AI news 2025"`;

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "websearch",
		label: "Web Search",
		description: DESCRIPTION.replace("{{year}}", new Date().getFullYear().toString()),
		promptSnippet: "Search the web for current information using Exa AI",

		parameters: Type.Object({
			query: Type.String({ description: "Web search query" }),
			numResults: Type.Optional(
				Type.Number({ description: `Number of search results to return (default: ${API_CONFIG.DEFAULT_NUM_RESULTS})` }),
			),
			livecrawl: Type.Optional(
				StringEnum(["fallback", "preferred"] as const, {
					description:
						"Live crawl mode - 'fallback': use live crawling as backup if cached content unavailable, 'preferred': prioritize live crawling",
				}),
			),
			type: Type.Optional(
				StringEnum(["auto", "fast", "deep"] as const, {
					description:
						"Search type - 'auto': balanced search (default), 'fast': quick results, 'deep': comprehensive search",
				}),
			),
			contextMaxCharacters: Type.Optional(
				Type.Number({
					description: `Maximum characters for context string optimized for LLMs (default: ${API_CONFIG.DEFAULT_CONTEXT_MAX_CHARS})`,
				}),
			),
		}),

		async execute(_toolCallId, params, signal, _onUpdate, _ctx) {
			const searchRequest: McpSearchRequest = {
				jsonrpc: "2.0",
				id: 1,
				method: "tools/call",
				params: {
					name: "web_search_exa",
					arguments: {
						query: params.query,
						type: params.type || "auto",
						numResults: params.numResults || API_CONFIG.DEFAULT_NUM_RESULTS,
						livecrawl: params.livecrawl || "fallback",
						contextMaxCharacters: params.contextMaxCharacters || API_CONFIG.DEFAULT_CONTEXT_MAX_CHARS,
					},
				},
			};

			// Set up timeout
			const timeoutId = setTimeout(() => {
				// Signal will be handled by fetch
			}, API_CONFIG.TIMEOUT_MS);

			const abortController = new AbortController();

			// Link external signal to our controller
			if (signal) {
				const onAbort = () => abortController.abort();
				signal.addEventListener("abort", onAbort);
				if (signal.aborted) {
					abortController.abort();
				}
			}

			try {
				const headers: Record<string, string> = {
					accept: "application/json, text/event-stream",
					"content-type": "application/json",
				};

				const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SEARCH}`, {
					method: "POST",
					headers,
					body: JSON.stringify(searchRequest),
					signal: abortController.signal,
				});

				clearTimeout(timeoutId);

				if (!response.ok) {
					const errorText = await response.text();
					throw new Error(`Search error (${response.status}): ${errorText}`);
				}

				const responseText = await response.text();

				// Parse SSE response
				const lines = responseText.split("\n");
				for (const line of lines) {
					if (line.startsWith("data: ")) {
						const data: McpSearchResponse = JSON.parse(line.substring(6));
						if (data.result?.content?.length > 0) {
							return {
								content: [{ type: "text", text: data.result.content[0].text }],
								details: {
									query: params.query,
									numResults: params.numResults || API_CONFIG.DEFAULT_NUM_RESULTS,
								},
							};
						}
					}
				}

				return {
					content: [{ type: "text", text: "No search results found. Please try a different query." }],
					details: { query: params.query },
				};
			} catch (error) {
				clearTimeout(timeoutId);

				if (error instanceof Error && error.name === "AbortError") {
					throw new Error("Search request timed out");
				}
				throw error;
			}
		},
	});
}
